# Add to Apple Wallet

The IDGate Code card can issue the active **virtual identity** as a signed Apple
Wallet pass (`.pkpass`) whose QR barcode carries the same IDGate address string
shown under the on-screen QR.

## Where it runs

- **Signing endpoint:** `api/wallet-pass.ts` — a Vercel serverless (Node) function.
  It only exists on the **Vercel** deployment; the GitHub Pages build has no `/api`.
- **Feature flag:** the client shows the button only when `VITE_WALLET_API` is set
  at build time. It is set in `vercel.json` → `build.env` (so the Vercel build has
  it) and is **absent** on the GitHub Pages build (so Pages never shows the button).
- **Permission gate:** the button additionally requires the `tool.idgatePass`
  transaction key on the active identity.

So the Vercel version is the "full" build with Wallet; GitHub Pages stays unchanged.

## Making real passes (production)

A `.pkpass` Apple Wallet will actually add must be signed with an **Apple Pass Type
ID certificate**. Create a Pass Type ID + certificate in the Apple Developer portal,
then set these environment variables on the Vercel project (Settings → Environment
Variables). PEM values may be pasted raw or base64-encoded:

| Variable | What it is |
| --- | --- |
| `PASS_SIGNER_CERT` | Pass Type ID certificate (PEM) |
| `PASS_SIGNER_KEY` | Its private key (PEM) |
| `PASS_SIGNER_KEY_PASSPHRASE` | Private-key passphrase (if any) |
| `PASS_WWDR` | Apple WWDR intermediate certificate (PEM) |
| `PASS_TYPE_IDENTIFIER` | e.g. `pass.io.github.mhisham744.idgate` |
| `PASS_TEAM_IDENTIFIER` | Apple Developer Team ID |

Once all three cert values are present the function signs with them automatically.

## Previewing before the real cert exists

Until the real cert is supplied, **preview deployments** (`VERCEL_ENV !== production`)
fall back to a **self-signed** certificate so the whole flow is testable end to end.
The pass downloads and opens, but Apple Wallet will refuse to add it (expected) and
the pass back shows a notice to that effect. Force the fallback anywhere with
`PASS_ALLOW_DEV_CERT=1`. Without any cert and without the fallback, the endpoint
returns `501` and the UI surfaces a short "not configured yet" message.

## Native iOS note

This is wired for the web/Safari path (navigating to the signed pass opens the
native Add-to-Wallet sheet). Inside the Capacitor WKWebView a native PassKit
handler would be needed to present the sheet; that's out of scope here.
