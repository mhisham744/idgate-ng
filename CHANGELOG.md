# Changelog

Version history for IDGate. Every deploy is a tagged, revertible release.

**Convention (per deploy):**
1. Bump `version` in `package.json` (semver).
2. Add an entry below summarizing the change.
3. Commit, push, then tag the release commit: `git tag -a vX.Y.Z -m "vX.Y.Z" && git push origin vX.Y.Z`.

**Reverting:**
- **Code:** check out / redeploy a previous tag (`git checkout vX.Y.Z`).
- **Live site (fastest):** Vercel dashboard → the project → Deployments → **Instant Rollback** / promote a previous deployment. Every push is kept as an immutable deployment.

The in-app version is shown in Settings; the per-build `version.json` also carries it.

---

## v1.1.0 — 2026-11-12
Versioning introduced + Concept Note 2/11.

**Personal account**
- Creation: a filled Language 1 / Language 2 now requires its fluency level.
- Change: removed the mother-tongue fluency field; Language 1 & 2 (and fluency) are optional, but a filled language requires its fluency.

**Communication Area**
- Prevent creating a duplicate communication-area name under the same personal account.

**My Organization**
- Creation: Domain field is mandatory in step 1 (Corporate Master Data); multiple authorization profiles can be created in step 3.
- Display/manage: viewing/editing an organization's master data is restricted to an authorized **virtual** account (the Administrator virtual, or a virtual whose profile grants admin rights) — the personal/admin account is prompted to switch.
- Positions can be renamed while managing the organization.
- The auto-created Administrator virtual's sole linked person cannot be unlinked/blocked until a second admin person is linked.
- The Delegation Profile now shows "Number of authorization required" and "Delegate others" when adding, editing, or displaying.

## v1.0.0 — prior
Baseline (pre-versioning): the Final Test 3–8 / Concept Note 1/11 work, credentials/tawkeel/wallet/hiring/news, and cross-device sync.
