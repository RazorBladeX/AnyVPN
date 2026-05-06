use std::{
    collections::VecDeque,
    io::{BufRead, BufReader, Write},
    net::{TcpListener, TcpStream},
    path::{Path, PathBuf},
    process::{Child, Command as StdCommand, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, Instant},
};

use chrono::Utc;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

use crate::{
    models::{AppSettings, ConnectionState, ConnectionStatus, LogEntry, Profile},
    openvpn, profiles,
};

pub struct VpnController {
    child: Option<VpnChild>,
    management_port: Option<u16>,
    management_stream: Arc<Mutex<Option<TcpStream>>>,
    status: Arc<Mutex<ConnectionStatus>>,
    logs: Arc<Mutex<VecDeque<LogEntry>>>,
}

enum VpnChild {
    Sidecar(CommandChild),
    System(Child),
}

impl VpnController {
    pub fn new(initial_state: ConnectionState) -> Self {
        let mut status = ConnectionStatus::default();
        status.state = initial_state;
        Self {
            child: None,
            management_port: None,
            management_stream: Arc::new(Mutex::new(None)),
            status: Arc::new(Mutex::new(status)),
            logs: Arc::new(Mutex::new(VecDeque::with_capacity(600))),
        }
    }

    pub fn connect(
        &mut self,
        app: &AppHandle,
        profile: Profile,
        settings: AppSettings,
    ) -> Result<ConnectionStatus, String> {
        if self.child.is_some() {
            return Err("A VPN connection is already active or connecting.".to_string());
        }
        if profile.backend == "wireguard" {
            return Err("WireGuard profile import is enabled, but WireGuard tunnel activation is not available in this build yet. Use an OpenVPN profile or watch the WireGuard backend roadmap.".to_string());
        }

        let management_port = reserve_management_port()?;
        let working_dir = profile
            .config_path
            .parent()
            .ok_or_else(|| "Profile path has no parent directory.".to_string())?
            .to_path_buf();
        let args = openvpn_args(&profile, &settings, management_port);

        self.push_log(format!("Opening OpenVPN management interface on 127.0.0.1:{management_port}"));

        let child = match spawn_sidecar(app, &args, &working_dir) {
            Ok(child) => {
                self.push_log("Launching bundled OpenVPN sidecar.".to_string());
                child
            }
            Err(sidecar_error) => {
                self.push_log(format!("Bundled OpenVPN sidecar unavailable: {sidecar_error}"));
                let app_paths = profiles::app_paths(app)?;
                let executable = openvpn::resolve_configured_or_system_openvpn(
                    &app_paths.app_data_dir,
                    settings.openvpn_binary_path.clone(),
                )
                .ok_or_else(|| {
                    format!(
                        "{}\n\nSidecar startup error: {sidecar_error}",
                        openvpn::diagnostics(&app_paths.app_data_dir).instructions
                    )
                })?;
                self.push_log(format!("Falling back to OpenVPN CLI: {}", executable.display()));
                spawn_system_openvpn(
                    executable,
                    &args,
                    &working_dir,
                    app,
                    Arc::clone(&self.status),
                    Arc::clone(&self.logs),
                )?
            }
        };

        self.set_status(app, |status| {
            status.state = ConnectionState::Connecting;
            status.active_profile_id = Some(profile.id.clone());
            status.active_profile_name = Some(profile.name.clone());
            status.connected_at = None;
            status.public_ip = None;
            status.location = profile.country.clone();
            status.bytes_in = 0;
            status.bytes_out = 0;
            status.download_mbps = 0.0;
            status.upload_mbps = 0.0;
            status.last_error = None;
        });

        spawn_management_reader(
            app.clone(),
            management_port,
            Arc::clone(&self.management_stream),
            Arc::clone(&self.status),
            Arc::clone(&self.logs),
        );

        self.management_port = Some(management_port);
        self.child = Some(child);
        profiles::mark_connected(app, &profile.id)?;
        Ok(self.status())
    }

    pub fn disconnect(&mut self, app: &AppHandle) -> Result<ConnectionStatus, String> {
        self.set_status(app, |status| {
            status.state = ConnectionState::Disconnecting;
        });

        if let Err(error) = send_management_command(&self.management_stream, self.management_port, "signal SIGTERM\n") {
            if self.management_port.is_some() {
                self.push_log(format!("Management disconnect failed, falling back to process kill: {error}"));
            }
        } else {
            self.push_log("Disconnect signal sent through OpenVPN management interface.".to_string());
        }

        if let Some(child) = self.child.take() {
            match child {
                VpnChild::Sidecar(child) => {
                    thread::sleep(Duration::from_secs(2));
                    let _ = child.kill();
                }
                VpnChild::System(mut child) => {
                    let started = Instant::now();
                    loop {
                        match child.try_wait() {
                            Ok(Some(_)) => break,
                            Ok(None) if started.elapsed() < Duration::from_secs(4) => {
                                thread::sleep(Duration::from_millis(120));
                            }
                            _ => {
                                let _ = child.kill();
                                let _ = child.wait();
                                break;
                            }
                        }
                    }
                }
            }
        }

        self.management_port = None;
        if let Ok(mut stream) = self.management_stream.lock() {
            *stream = None;
        }

        self.set_status(app, |status| {
            status.state = ConnectionState::Disconnected;
            status.active_profile_id = None;
            status.active_profile_name = None;
            status.connected_at = None;
            status.download_mbps = 0.0;
            status.upload_mbps = 0.0;
        });
        self.push_log("OpenVPN process stopped.".to_string());
        Ok(self.status())
    }

    pub fn status(&self) -> ConnectionStatus {
        self.status.lock().map(|status| status.clone()).unwrap_or_default()
    }

    pub fn logs(&self) -> Vec<LogEntry> {
        self.logs
            .lock()
            .map(|logs| logs.iter().cloned().collect())
            .unwrap_or_default()
    }

    pub fn clear_logs(&self) {
        if let Ok(mut logs) = self.logs.lock() {
            logs.clear();
        }
    }

    fn set_status<F>(&self, app: &AppHandle, update: F)
    where
        F: FnOnce(&mut ConnectionStatus),
    {
        if let Ok(mut status) = self.status.lock() {
            update(&mut status);
            let _ = app.emit("vpn-status", status.clone());
        }
    }

    fn push_log(&self, line: String) {
        append_log(&self.logs, classify_log(&line));
    }
}

fn openvpn_args(profile: &Profile, settings: &AppSettings, management_port: u16) -> Vec<String> {
    let mut args = vec![
        "--config".to_string(),
        profile.config_path.to_string_lossy().to_string(),
        "--verb".to_string(),
        openvpn_verbosity(&settings.logging_level).to_string(),
        "--connect-retry-max".to_string(),
        (if settings.auto_reconnect { "0" } else { "3" }).to_string(),
        "--management".to_string(),
        "127.0.0.1".to_string(),
        management_port.to_string(),
        "--management-query-passwords".to_string(),
        "--management-signal".to_string(),
    ];

    if let Some(mtu) = settings.mtu {
        args.extend(["--tun-mtu".to_string(), mtu.to_string()]);
    }
    if settings.dns_leak_protection {
        args.extend([
            "--pull-filter".to_string(),
            "ignore".to_string(),
            "dhcp-option DNS6".to_string(),
        ]);
    }
    if settings.ipv6_leak_protection {
        args.extend([
            "--pull-filter".to_string(),
            "ignore".to_string(),
            "ifconfig-ipv6".to_string(),
            "--pull-filter".to_string(),
            "ignore".to_string(),
            "route-ipv6".to_string(),
        ]);
    }

    args
}

fn spawn_sidecar(app: &AppHandle, args: &[String], working_dir: &Path) -> Result<VpnChild, String> {
    let (mut rx, child) = app
        .shell()
        .sidecar("openvpn")
        .map_err(|error| error.to_string())?
        .args(args)
        .current_dir(working_dir)
        .spawn()
        .map_err(|error| error.to_string())?;

    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) | CommandEvent::Stderr(line) => {
                    if let Ok(text) = String::from_utf8(line) {
                        for line in text.lines() {
                            let _ = app.emit("vpn-log", classify_log(line));
                        }
                    }
                }
                CommandEvent::Error(error) => {
                    let _ = app.emit("vpn-log", classify_log(&format!("OpenVPN sidecar error: {error}")));
                }
                CommandEvent::Terminated(payload) => {
                    let _ = app.emit(
                        "vpn-log",
                        classify_log(&format!("OpenVPN sidecar exited with code {:?}", payload.code)),
                    );
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(VpnChild::Sidecar(child))
}

fn spawn_system_openvpn(
    executable: PathBuf,
    args: &[String],
    working_dir: &Path,
    app: &AppHandle,
    status: Arc<Mutex<ConnectionStatus>>,
    logs: Arc<Mutex<VecDeque<LogEntry>>>,
) -> Result<VpnChild, String> {
    let mut command = StdCommand::new(executable);
    command
        .args(args)
        .current_dir(working_dir)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let mut child = command.spawn().map_err(|error| {
        format!(
            "Unable to start OpenVPN under AnyVPN control. Use the bundled sidecar setup or run AnyVPN with administrator/root privileges. Details: {error}"
        )
    })?;

    if let Some(stdout) = child.stdout.take() {
        spawn_std_reader(app.clone(), stdout, Arc::clone(&status), Arc::clone(&logs));
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_std_reader(app.clone(), stderr, status, logs);
    }

    Ok(VpnChild::System(child))
}

fn spawn_std_reader<R>(
    app: AppHandle,
    reader: R,
    status: Arc<Mutex<ConnectionStatus>>,
    logs: Arc<Mutex<VecDeque<LogEntry>>>,
) where
    R: std::io::Read + Send + 'static,
{
    thread::spawn(move || {
        for line in BufReader::new(reader).lines().map_while(Result::ok) {
            append_log(&logs, classify_log(&line));
            update_status_from_log(&status, &line);
            let _ = app.emit("vpn-log", classify_log(&line));
            emit_status(&app, &status);
        }
    });
}

fn spawn_management_reader(
    app: AppHandle,
    port: u16,
    shared_stream: Arc<Mutex<Option<TcpStream>>>,
    status: Arc<Mutex<ConnectionStatus>>,
    logs: Arc<Mutex<VecDeque<LogEntry>>>,
) {
    thread::spawn(move || {
        let mut stream = match connect_management(port) {
            Ok(stream) => stream,
            Err(error) => {
                append_log(&logs, classify_log(&format!("Unable to connect to management interface: {error}")));
                return;
            }
        };

        let _ = stream.write_all(b"state on\n");
        let _ = stream.write_all(b"bytecount 1\n");
        let _ = stream.write_all(b"log on all\n");
        let _ = stream.flush();

        if let Ok(writer) = stream.try_clone() {
            if let Ok(mut slot) = shared_stream.lock() {
                *slot = Some(writer);
            }
        }

        let mut previous_bytes: Option<(u64, u64, Instant)> = None;
        let reader_stream = match stream.try_clone() {
            Ok(stream) => stream,
            Err(error) => {
                append_log(&logs, classify_log(&format!("Unable to monitor management interface: {error}")));
                return;
            }
        };

        for line in BufReader::new(reader_stream).lines().map_while(Result::ok) {
            if let Some((bytes_in, bytes_out)) = parse_bytecount(&line) {
                let now = Instant::now();
                if let Some((prev_in, prev_out, prev_at)) = previous_bytes {
                    let elapsed = now.duration_since(prev_at).as_secs_f64().max(0.001);
                    let down = bytes_in.saturating_sub(prev_in) as f64 * 8.0 / elapsed / 1_000_000.0;
                    let up = bytes_out.saturating_sub(prev_out) as f64 * 8.0 / elapsed / 1_000_000.0;
                    if let Ok(mut snapshot) = status.lock() {
                        snapshot.bytes_in = bytes_in;
                        snapshot.bytes_out = bytes_out;
                        snapshot.download_mbps = down;
                        snapshot.upload_mbps = up;
                    }
                }
                previous_bytes = Some((bytes_in, bytes_out, now));
                emit_status(&app, &status);
                continue;
            }

            if line.starts_with(">STATE:") {
                update_status_from_management(&status, &line);
                append_log(&logs, classify_log(&line));
                let _ = app.emit("vpn-log", classify_log(&line));
                emit_status(&app, &status);
                continue;
            }

            if line.starts_with(">LOG:") || line.starts_with("SUCCESS:") || line.starts_with("ERROR:") {
                append_log(&logs, classify_log(&line));
                let _ = app.emit("vpn-log", classify_log(&line));
            }
        }
    });
}

fn connect_management(port: u16) -> Result<TcpStream, String> {
    let address = format!("127.0.0.1:{port}");
    let started = Instant::now();
    loop {
        match TcpStream::connect(&address) {
            Ok(stream) => {
                let _ = stream.set_read_timeout(Some(Duration::from_secs(2)));
                let _ = stream.set_write_timeout(Some(Duration::from_secs(2)));
                return Ok(stream);
            }
            Err(error) if started.elapsed() < Duration::from_secs(8) => {
                let _ = error;
                thread::sleep(Duration::from_millis(150));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
}

fn send_management_command(
    shared_stream: &Arc<Mutex<Option<TcpStream>>>,
    fallback_port: Option<u16>,
    command: &str,
) -> Result<(), String> {
    if let Ok(mut slot) = shared_stream.lock() {
        if let Some(stream) = slot.as_mut() {
            stream
                .write_all(command.as_bytes())
                .map_err(|error| error.to_string())?;
            return stream.flush().map_err(|error| error.to_string());
        }
    }

    let port = fallback_port.ok_or_else(|| "Management interface is not connected.".to_string())?;
    let mut stream = TcpStream::connect(("127.0.0.1", port)).map_err(|error| error.to_string())?;
    stream
        .write_all(command.as_bytes())
        .map_err(|error| error.to_string())?;
    stream.flush().map_err(|error| error.to_string())
}

fn reserve_management_port() -> Result<u16, String> {
    for port in 7505..=7525 {
        if TcpListener::bind(("127.0.0.1", port)).is_ok() {
            return Ok(port);
        }
    }
    Err("No available OpenVPN management port in range 7505-7525.".to_string())
}

fn append_log(logs: &Arc<Mutex<VecDeque<LogEntry>>>, entry: LogEntry) {
    if let Ok(mut logs) = logs.lock() {
        if logs.len() >= 600 {
            logs.pop_front();
        }
        logs.push_back(entry);
    }
}

fn classify_log(line: &str) -> LogEntry {
    let lower = line.to_ascii_lowercase();
    let level = if lower.contains("error") || lower.contains("failed") || lower.contains("fatal") {
        "error"
    } else if lower.contains("warn") || lower.contains("deprecated") {
        "warn"
    } else {
        "info"
    };

    LogEntry {
        timestamp: Utc::now(),
        level: level.to_string(),
        message: line.to_string(),
    }
}

fn emit_status(app: &AppHandle, status: &Arc<Mutex<ConnectionStatus>>) {
    if let Ok(snapshot) = status.lock() {
        let _ = app.emit("vpn-status", snapshot.clone());
    }
}

fn parse_bytecount(line: &str) -> Option<(u64, u64)> {
    let rest = line.strip_prefix(">BYTECOUNT:")?;
    let (bytes_in, bytes_out) = rest.split_once(',')?;
    Some((bytes_in.trim().parse().ok()?, bytes_out.trim().parse().ok()?))
}

fn update_status_from_management(status: &Arc<Mutex<ConnectionStatus>>, line: &str) {
    let lower = line.to_ascii_lowercase();
    if let Ok(mut snapshot) = status.lock() {
        if lower.contains(",connected,success") || lower.contains(",connected,") {
            snapshot.state = ConnectionState::Connected;
            snapshot.connected_at.get_or_insert_with(Utc::now);
            snapshot.last_error = None;
        } else if lower.contains(",wait,") || lower.contains(",auth,") || lower.contains(",get_config,") {
            snapshot.state = ConnectionState::Connecting;
        } else if lower.contains(",exiting,") || lower.contains(",exit,") {
            snapshot.state = ConnectionState::Disconnected;
        } else if lower.contains("auth_failed") || lower.contains("error") {
            snapshot.state = ConnectionState::Error;
            snapshot.last_error = Some(line.to_string());
        }
    }
}

fn update_status_from_log(status: &Arc<Mutex<ConnectionStatus>>, line: &str) {
    let lower = line.to_ascii_lowercase();
    if let Ok(mut snapshot) = status.lock() {
        if lower.contains("initialization sequence completed") {
            snapshot.state = ConnectionState::Connected;
            snapshot.connected_at.get_or_insert_with(Utc::now);
            snapshot.last_error = None;
        } else if lower.contains("auth_failed")
            || lower.contains("exiting due to fatal error")
            || lower.contains("cannot open tun")
            || lower.contains("permission denied")
        {
            snapshot.state = ConnectionState::Error;
            snapshot.last_error = Some(line.to_string());
        }
    }
}

fn openvpn_verbosity(level: &str) -> &'static str {
    match level {
        "silent" => "0",
        "warn" => "2",
        "debug" => "5",
        _ => "3",
    }
}

#[cfg(test)]
mod tests {
    use super::parse_bytecount;

    #[test]
    fn parses_management_bytecount() {
        assert_eq!(parse_bytecount(">BYTECOUNT:1024,2048"), Some((1024, 2048)));
    }
}
