# Contributing to AnyVPN

Thanks for helping make AnyVPN better.

## Development workflow

1. Create a focused branch from `main`.
2. Use conventional commits, for example `feat: add split tunneling settings`.
3. Keep changes small, testable, and documented.
4. Run the verification suite before opening a pull request:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run build
cd src-tauri
cargo test
cargo check
```

## Code standards

- Prefer typed, small React components with clear props.
- Keep Tauri commands narrow and explicit.
- Never store VPN credentials in plaintext.
- Use platform-specific network/firewall behavior behind small Rust functions.
- Document security-sensitive behavior in code comments or README sections.

## Pull requests

Pull requests should include:

- A clear problem statement.
- Screenshots or screen recordings for UI changes.
- Tests for new logic.
- Notes about platform-specific behavior.

## Release versioning

AnyVPN follows semantic versioning:

- `MAJOR` for incompatible changes.
- `MINOR` for backwards-compatible features.
- `PATCH` for backwards-compatible fixes.
