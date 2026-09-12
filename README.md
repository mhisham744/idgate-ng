# IDGate — Identity Gate

> A mobile-first identity & official-communication hub for Egypt — an interactive, end-to-end **demo** built as a single-page React app.

**Live demo:** https://mhisham744.github.io/idgate-ng/

IDGate imagines a single national gateway where a citizen manages one verified identity, spins up
**virtual identities** for the organizations and roles they represent, and handles official
communication — messages, actionable notifications, groups, and directory lookups — from one
bilingual, RTL-aware interface. All data is seeded and stored locally in the browser; there is no
backend.

---

## Highlights

- **Identity-verification onboarding** — a KYC-style wizard, passkey/OTP sign-in mockups, and
  tiered **verification badges**.
- **One person, many identities** — a personal (normal) account plus **virtual identities** linked
  to it (companies, entities, roles), with a quick account switcher and per-account presence.
- **Messaging** — threaded messages with to/cc/bcc, read state, soft-delete, and in-session
  attachments (blobs never persisted).
- **Notifications as a task/communication system** — multi-recipient notes where **each recipient
  reacts and converses privately** with the sender. Per-recipient status
  (`pending → accepted / rejected / clarify → closed`), sender edit/freeze, ≤20-word clarifications,
  attachments, and a subject search. See the [notification model](#notification-model) below.
- **Home status bar** — a six-cell activity bar (**Message · Notification · Pending · Duties ·
  Calendar · Status**) that aggregates across the personal account **and all owned virtuals**.
- **Org & directory tooling** — entities with org charts, groups, a people/entity directory,
  vacancies, and an IDGate QR code screen.
- **Bilingual AR/EN + full RTL**, light/dark themes, and a phone-style responsive layout with a
  desktop sidebar.

---

## Tech stack

| Concern | Choice |
|---|---|
| UI | React 18.3 + TypeScript 5.6 (strict) |
| Build | Vite 5.4 |
| Styling | TailwindCSS 3.4 (`darkMode: 'class'`, CSS-var remapping for dark) |
| State | Zustand 5 with `persist` (localStorage key `idgate.app`) |
| Routing | react-router-dom v6 (`HashRouter`, for static hosting) |
| Icons / misc | lucide-react, qrcode.react, clsx |

Path alias: `@/*` → `src/*`.

---

## Getting started

```bash
git clone https://github.com/mhisham744/idgate-ng.git
cd idgate-ng
npm install

npm run dev        # Vite dev server
npm run typecheck  # tsc --noEmit
npm run build      # production build → dist/
npm run preview    # preview the production build locally
```

The app opens on the **onboarding** flow. Complete it once to reach the signed-in shell; state
persists in localStorage, so subsequent loads land you straight in.

> **Reset the demo:** clear the `idgate.app` key in your browser's localStorage (or use the app's
> settings) to re-seed from scratch.

---

## Project structure

```
src/
  screens/          Route-level screens
    Onboarding.tsx      KYC wizard + sign-in
    Home.tsx            Dashboard + six-cell status bar
    Messages.tsx        Threaded messaging
    Notifications.tsx   Multi-recipient notes + per-recipient threads
    Tools.tsx           IDGate code / vacancies / groups launcher
    Directory.tsx       People & entity directory
    Settings.tsx        Personal data, entities, about
    MyEntities.tsx / EntityWizard.tsx / EntityManage.tsx
    Groups.tsx / Vacancies.tsx / IDGateCode.tsx / AboutConcept.tsx
  components/
    AppShell.tsx        Nav (sidebar + bottom bar), account switcher, badges
    StatusBar.tsx       Home six-cell activity bar
    RecipientPicker.tsx People + groups multi-select
    MiniCalendar.tsx / OrgChart.tsx / VerificationBadge.tsx / identity.tsx
  store/index.ts      Zustand store: all state + actions + persist config
  lib/
    identity.ts         ActorRef helpers (actorKey, uid, formatDate, relativeTime)
    userScope.ts        useMyInbox — user-level aggregation across owned accounts
  data/
    reference.ts        Domain enums/labels (org types, transactions, note kinds)
    seed.ts             Seeded demo data
  i18n/                 EN/AR strings + useLang()
  theme/                Light/dark theme store
  types/                Shared TypeScript types
```

---

## Core concepts

### Identities & scoping
- An **`ActorRef`** is either `{ kind:'normal', normalId }` or `{ kind:'virtual', virtualId }`;
  `actorKey(a)` serializes it to `n:<id>` / `v:<id>`.
- The signed-in person acts through **multiple accounts** (personal + owned virtuals). `useMyInbox`
  aggregates activity across **all** of them for the Home status bar, while the Messages /
  Notifications screens and the nav badges are scoped to the **active** account.

### Notification model
Notifications are a per-recipient task/communication primitive:
- A note has one sender and **many recipients**; each recipient carries **its own status** and its
  **own private thread** — recipient A never sees recipient B's conversation.
- Statuses flow `pending → accepted / rejected / clarify → closed`. **Clarify** posts a ≤20-word
  paragraph; the sender can reply. Once **closed**, that recipient is locked.
- The sender can **edit** the note's envelope (subject/body/date/time/venue) or **freeze** the whole
  note (disables input for everyone).
- Attachments follow the same pattern as Messages: `AttachmentMeta` kept, `dataUrl` blobs stripped
  before persisting.
- Persisted data is migrated on load (store persist `version: 2`) from the older single-status
  shape into the per-recipient shape.

### Home status bar (six cells)
| Cell | Shows |
|---|---|
| **Message** | Unread messages (recipient-side, whole account); tap marks read |
| **Notification** | Non-reacted received notes; quick Accept/Reject clears them |
| **Pending** | Sender-side notes not yet fully closed (unread dot on new recipient activity) |
| **Duties** | Notes you accepted but haven't closed |
| **Calendar** | Dated items (sent + received) on a mini calendar |
| **Status** | Presence (active / busy / away / closed) |

---

## Deployment

Pushing to `main` triggers **GitHub Actions** (`.github/workflows/deploy.yml`), which builds and
publishes to **GitHub Pages** at https://mhisham744.github.io/idgate-ng/.

Because the app uses `HashRouter`, it runs from any static host with no server-side routing config.

---

## Notes

- This is a **front-end demo**: all identities, messages, and notifications are seeded and live only
  in the browser's localStorage. No real KYC, authentication, or data leaves the device.
- Bilingual and RTL are first-class: use logical CSS properties (`ps/pe/ms/me`, `text-start/end`)
  and the fixed-hex accent colors (emerald/amber/rose/violet/teal) for anything that must read
  correctly in both light and dark themes.
