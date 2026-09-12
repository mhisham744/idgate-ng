# IDGate — Session Handoff

_Last updated: 2026-09-12_

This file captures the state of work so it can be resumed on another machine.
Pull `main`, run `npm install`, then `npm run dev`.

---

## How to get running on a new machine

```bash
git clone https://github.com/mhisham744/idgate-ng.git   # or your auth of choice
cd idgate-ng
npm install
npm run dev        # local dev server (Vite)
npm run typecheck  # tsc --noEmit  (must be clean)
npm run build      # vite build → dist/
```

- **Stack:** React 18.3 + Vite 5.4 + TypeScript 5.6 (strict; `noUnusedLocals/Parameters` off) +
  TailwindCSS 3.4 + Zustand 5 (persist, key `idgate.app`) + react-router-dom v6 (HashRouter).
- **Path alias:** `@/*` → `src/*`.
- **Bilingual AR/EN + RTL** throughout (`useLang()` → `{lang, t, dir, isRtl}`).
- **Dark mode** via CSS-var remapping (`darkMode:'class'`); emerald/amber/rose/violet/teal are
  fixed hex in both themes — use those for dots/badges.

## Deploy

- Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) → GitHub Pages.
- **Repo:** `mhisham744/idgate-ng` · **Live:** https://mhisham744.github.io/idgate-ng/
- No local git remote is configured; pushes use an inline-token URL with `-c credential.helper=`
  so nothing is written to config. The current live build is commit `1d30ffc`.

### ⚠️ Security — rotate the token
The GitHub PAT used for pushing (`ghp_…1xcGSE`) was shared in plaintext and must be treated as
**compromised**. Revoke/rotate it: GitHub → Settings → Developer settings → Personal access tokens.
On the new machine, generate a **fresh** token and never commit it.

---

## What was built this session — Notification system + top-bar overhaul

Shipped in commit `1d30ffc`. Reviewed by an adversarial workflow (4 dimensions → per-finding
verification); 3 confirmed defects fixed before deploy (see below). Typecheck + build clean;
Actions deploy succeeded; live site returns 200.

### Notification page (all 18 requested items)
- **Per-recipient private threads + independent status** — each sender↔recipient pair has its own
  conversation and its own status (`pending | accepted | rejected | clarify | closed`).
  Recipient A's activity is invisible to recipient B.
- **Multi-recipient create form** — fields in order: **Type** (was "Kind", req), **To** (req,
  people + groups picker, expands to deduped `ActorRef[]`), **Subject** (req), **Message** (req),
  **Target date** (req), **Target Time** (opt), **Target venue** (opt), **attachments** (in-session).
- Removed **Voting** and **IDGate** from the create Type list; relabelled **Tender → "Tender /
  Purchase order"**.
- **List shows sent + received** for the active account, sorted by last activity, with a **subject
  search** box.
- **Drill-in thread** (`NoteThreadSheet`):
  - _Sender view_: one section per recipient (their status + private thread) + **reply** to
    clarifications + **Edit** envelope (subject/body/date/time/venue) + **Freeze**.
  - _Recipient view_: my thread + reaction bar **Accept / Reject / Clarify / Close**; **Clarify**
    is a ≤20-word paragraph (word-count guard); recipient can change status while open.
  - **Closed** locks that recipient (no further status change / messages); **Frozen** disables
    input for everyone.

### Home top bar (`StatusBar`) — six cells
`Message · Notification · Pending · Duties · Calendar · Status`. Counts are **user-level**
(aggregate personal account + all owned virtuals) via `useMyInbox`; each cell opens a filtered
sheet:
- **Message** → unread messages (recipient-side, whole account); tap marks read → disappears.
- **Notification** → non-reacted **received** notes; quick Accept/Reject removes them.
- **Pending** → sender-side notes not fully closed; unread dot when a recipient posted an unseen update.
- **Duties** → notes I accepted but haven't closed.
- **Calendar** → `MiniCalendar` over dated items (sent + received); behavior unchanged.
- **Status** → presence menu (unchanged).

### Persistence
- Persist bumped to **version 2** with `migrate()` reshaping v1 notes (`to[]/status/history`) into
  `recipients[]` (per-recipient status; `completed` → `closed`; `frozen:false`).
- `partialize` strips `dataUrl` from `notifications[].attachments` and
  `recipients[].thread[].attachments` (blobs never persisted — mirrors Messages).

### Review fixes applied before deploy
1. **Frozen-while-pending notes** were stuck permanently in recipient counts with no-op quick-react
   buttons → frozen notes now excluded from `nonReactedNotes` (`userScope`) and the AppShell nav badge.
2. Same defect from a second reviewer → covered by the same fix.
3. **AppShell message badge** ignored cc/bcc and `deletedBy` → now matches to/cc/bcc, excludes
   deleted and self-sent, consistent with `useMyInbox` and `StatusBar`.

---

## Key files (this feature)

| File | Role |
|---|---|
| `src/types/index.ts` | `NoteStatus`, `NoteThreadEntry`, `NoteRecipient`, extended `Notification` |
| `src/store/index.ts` | Notification actions + persist v2 migration/partialize |
| `src/lib/userScope.ts` | `useMyInbox` (user-level aggregates); `myRecipientOf`, `threadHasUnseen` |
| `src/screens/Notifications.tsx` | List + search + create + thread drill-down |
| `src/components/StatusBar.tsx` | Six-cell top bar + filtered sheets |
| `src/components/AppShell.tsx` | Nav badges (active-scoped) |
| `src/data/reference.ts` | `NOTE_KIND_LABELS` (Tender relabel) |
| `src/data/seed.ts` | Seeded notes reshaped to `recipients[]` |
| `src/i18n/index.ts` | New EN/AR strings |

## Architecture notes worth keeping in mind
- **Scoping:** the Notifications _screen_ and the AppShell nav badge are **active-account scoped**;
  the top-bar counts are **user-level** (personal + owned virtuals). This is intentional and matches
  the Messages pattern.
- Identity: `ActorRef = {kind:'normal';normalId} | {kind:'virtual';virtualId}`;
  `actorKey(a)` = `n:${id}` / `v:${id}`. `myActorKeys()` = personal + owned virtuals.
- Reactions in the store are authored by the **actual recipient's ref** (`respondNotification`),
  while sender replies/edits/freeze are authored by the **active** account.

## Possible next steps (not started)
- Deep-link from a top-bar sheet row directly to the specific note thread (currently navigates to
  the Notifications screen).
- Consider whether frozen-but-accepted notes should also leave **Duties** (currently they remain).
- Bundle is ~461 kB (133 kB gzip) — code-splitting could trim it if load time matters.
