# AnyVPN

AnyVPN is a polished Tauri v2 desktop VPN client for OpenVPN profiles. It uses
React 19, TypeScript, Tailwind CSS, shadcn-style primitives, lucide-react,
framer-motion, Vitest, and Rust.

## Screenshots

Add current release screenshots under `docs/screenshots/` before publishing a
public release:

- `docs/screenshots/home.png`
- `docs/screenshots/profiles.png`
- `docs/screenshots/logs.png`
- `docs/screenshots/settings.png`

The UI is optimized for a frameless dark desktop shell with Home, Profiles,
Logs, and Settings navigation.

## Project structure

```text
src/
  App.tsx
  components/
    AppSidebar.tsx
    CustomTitleBar.tsx
    ConnectionToggle.tsx
    ProfileImportWizard.tsx
    SpeedSparkline.tsx
    ToastStack.tsx
    ui/
  pages/
    HomePage.tsx
    ProfilesPage.tsx
    LogsPage.tsx
    SettingsPage.tsx
  lib/
    flags.ts
    ipLookup.ts
    tauri.ts
    utils.ts
src-tauri/
  src/
    commands.rs
    lib.rs
    models.rs
    openvpn.rs
    profiles.rs
    settings.rs
    tray.rs
    vpn.rs
  capabilities/default.json
  sidecars/README.md
  tauri.conf.json
```

## Features

- Frameless platform-aware custom title bar:
  - macOS traffic lights on the left.
  - Windows/Linux controls on the right.
  - Full drag region and hover states.
- Home dashboard with disconnected public IP/location lookup, manual refresh,
  30-second disconnected auto-refresh, connected uptime, transfer totals, live
  speed samples, and recent connections.
- Profile import wizard with validation, parsing, remote host location lookup,
  detected country/flag, progress states, cancellation, and success toasts.
- Profiles page with search, sort, quick connect, rename, and delete.
- Dedicated live logs page with filtering, auto-scroll, clear, and export.
- Settings for launch/login, startup behavior, reconnect, DNS/IPv6 leak flags,
  OpenVPN binary path, verbosity, MTU, IP service, speed interval, title bar,
  animations, import/export, reset, updates, and about links.
- Rust backend profile storage, `.ovpn` validation, OpenVPN sidecar/system
  detection, process control, structured log streaming, tray actions,
  graceful disconnect, and single-instance protection.
- GitHub CI, release workflow, Dependabot, MIT license, and contribution guide.

## Install and run

Install prerequisites first:

- Node.js 22 recommended.
- Rust stable and Cargo.
- Tauri v2 platform prerequisites for Windows/macOS/Linux.
- OpenVPN installed system-wide, or an OpenVPN sidecar binary.

```powershell
npm.cmd install
npm.cmd run tauri dev
```

Frontend checks:

```powershell
npm.cmd test
npm.cmd run build
```

Rust checks:

```powershell
cd src-tauri
cargo test
cargo check
```

## Native installers

```powershell
npm.cmd run tauri build
```

Configured bundle targets:

- Windows: `.msi` and NSIS `.exe`
- macOS: `.dmg`
- Linux: `.AppImage` and `.deb`

Build each native installer on the matching OS or a properly configured CI
runner.

## OpenVPN sidecars

AnyVPN prefers a bundled OpenVPN sidecar controlled through Tauri Shell, then a
configured OpenVPN CLI path, then common system OpenVPN CLI install locations.
OpenVPN Connect GUI is intentionally not supported because it cannot provide
the management-interface control AnyVPN needs.

The release-only Tauri configuration uses:

```json
"externalBin": ["sidecars/openvpn"]
```

The default `src-tauri/tauri.conf.json` intentionally keeps `externalBin` empty
so `npm.cmd run tauri dev` works before a signed OpenVPN sidecar is present.
Use the release config once the correct sidecar exists:

```powershell
npm.cmd run tauri build -- --config src-tauri/tauri.release.conf.json
```

Prepare signed official OpenVPN binaries with Tauri target suffixes:

- Windows x64: `src-tauri/sidecars/openvpn-x86_64-pc-windows-msvc.exe`
- Windows ARM64: `src-tauri/sidecars/openvpn-aarch64-pc-windows-msvc.exe`
- macOS Apple Silicon: `src-tauri/sidecars/openvpn-aarch64-apple-darwin`
- macOS Intel: `src-tauri/sidecars/openvpn-x86_64-apple-darwin`
- Linux x64 GNU: `src-tauri/sidecars/openvpn-x86_64-unknown-linux-gnu`
- Linux ARM64 GNU: `src-tauri/sidecars/openvpn-aarch64-unknown-linux-gnu`

If no sidecar exists, AnyVPN falls back to the system OpenVPN binary and shows
clear diagnostics. Tunnel creation may require Administrator on Windows, a
privileged helper on macOS, or root/network capabilities on Linux.

Recommended sources:

- Windows: install OpenVPN Community Edition from
  `https://openvpn.net/community-downloads/`, copy `openvpn.exe` from its `bin`
  directory, and rename it to the Windows target suffix.
- macOS: install/build the OpenVPN CLI from a trusted distribution such as
  Homebrew, copy the `openvpn` binary, and rename it to the macOS target suffix.
- Linux: copy the `openvpn` CLI binary from your distribution package or
  official build artifact and rename it to the Linux target suffix.

## WireGuard roadmap

WireGuard `.conf` profile support is planned as the recommended modern backend.
The intended implementation is a dedicated Rust tunnel service using a
userspace backend such as `boringtun` plus a platform TUN abstraction. This is
not enabled yet because production WireGuard still needs privileged network
interface setup and keychain-safe secret handling.

## Security notes

- Profile import rejects script hooks, inline plaintext credentials, credential
  file references, and obvious command-execution patterns.
- Credentials should be entered through OpenVPN prompts or future keychain
  integration, not stored in `.ovpn` files.
- DNS and IPv6 leak-protection flags are passed to OpenVPN where possible.
- The kill-switch setting is persisted and ready for platform firewall rules.
  Production enforcement should use Windows Filtering Platform/netsh, macOS PF,
  and Linux nftables/iptables with safe rollback.

## Roadmap

- WireGuard support.
- Split tunneling.
- Real OpenVPN management-interface byte counters.
- Platform-native privileged helper.
- OS keychain credential prompts.
- Signed auto-updates and release feed.
