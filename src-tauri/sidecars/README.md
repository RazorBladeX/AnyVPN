# OpenVPN sidecar setup

AnyVPN is designed to control OpenVPN through a bundled Tauri sidecar plus the
OpenVPN management interface. The development config keeps `externalBin` empty
so `npm.cmd run tauri dev` works before binaries are present. Release builds
should use `src-tauri/tauri.release.conf.json`, which enables:

```json
"externalBin": ["sidecars/openvpn"]
```

Tauri resolves the target suffix automatically. Put exactly one official
OpenVPN CLI binary for each target you build:

- Windows x64: `openvpn-x86_64-pc-windows-msvc.exe`
- Windows ARM64: `openvpn-aarch64-pc-windows-msvc.exe`
- macOS Apple Silicon: `openvpn-aarch64-apple-darwin`
- macOS Intel: `openvpn-x86_64-apple-darwin`
- Linux x64 GNU: `openvpn-x86_64-unknown-linux-gnu`
- Linux ARM64 GNU: `openvpn-aarch64-unknown-linux-gnu`

Recommended sources:

- Windows: OpenVPN Community Edition from https://openvpn.net/community-downloads/.
  Install it once on a build machine, then copy `openvpn.exe` from the OpenVPN
  `bin` directory and rename it with the Windows target suffix above.
- macOS: build or package the OpenVPN CLI from an official/trusted distribution
  such as Homebrew (`brew install openvpn`), then copy the CLI binary and rename
  it with the macOS target suffix above.
- Linux: use your distribution OpenVPN package or official build artifact, copy
  the CLI binary, and rename it with the Linux target suffix above.

Do not use OpenVPN Connect GUI binaries. AnyVPN requires the OpenVPN CLI because
it starts the process with:

```text
--management 127.0.0.1 <port> --management-query-passwords --management-signal
```

Tunnel creation still requires OS network privileges. On Windows this usually
means running AnyVPN as Administrator or installing the TAP/Wintun driver. On
macOS/Linux this usually requires a privileged helper, root-launched OpenVPN,
or network capabilities.
