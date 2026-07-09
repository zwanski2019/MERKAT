# Desktop release & signing (Phase 9)

The Windows `.exe`/`.msi` is built, code-signed, and published by CI on a Windows
runner (`.github/workflows/release.yml`), triggered by a `v*` tag. Two signatures
are involved:

1. **Updater signature** (Tauri/minisign) — proves an update package is genuine
   before the app installs it. The **public** key lives in
   `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`); the **private** key is
   a CI secret. They must be a matching pair.
2. **Authenticode code-signing** — signs the installer so Windows/SmartScreen
   trusts it. Uses an Organization Validation (OV) or EV code-signing
   certificate (`.pfx`).

## One-time setup

1. **Generate the updater keypair** (do not reuse the throwaway pair in the repo
   history):

   ```sh
   pnpm --filter @merkat/desktop exec tauri signer generate -w merkat-updater.key
   ```

   Put the **public** key file's contents into `plugins.updater.pubkey` in
   `tauri.conf.json`. Store the **private** key + password as secrets.

2. **Obtain a code-signing certificate** (`.pfx`) from a CA. Base64-encode it:
   `base64 -w0 cert.pfx`.

3. **Add repository secrets:**
   - `TAURI_SIGNING_PRIVATE_KEY` — updater private key contents
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — its password (or empty)
   - `WINDOWS_CERTIFICATE` — base64 of the `.pfx`
   - `WINDOWS_CERTIFICATE_PASSWORD` — the `.pfx` password

## Cutting a release

```sh
# bump version in src-tauri/tauri.conf.json + Cargo.toml, then:
git tag v0.1.0 && git push --tags
```

CI builds the SPA, regenerates the DB migration from the model (§1.7), then runs
`tauri-action` to build + sign + upload a **draft** GitHub Release with the
installer and the updater artifacts (`latest.json` + signed bundles). Point
`plugins.updater.endpoints` at wherever you host `latest.json`, publish the
draft, and running terminals will auto-update.

## Local dev note

The desktop app can't compile on the CI-less Linux dev box used during Phases
0–8 (missing `webkit2gtk-4.1` / `javascriptcoregtk-4.1`). To run it locally on
Linux:

```sh
sudo apt install libwebkit2gtk-4.1-dev libjavascriptcoregtk-4.1-dev libsoup-3.0-dev
pnpm --filter @merkat/desktop tauri:dev
```

The signed **Windows** installer is produced only by the CI Windows runner — it
cannot be built or verified from Linux.
