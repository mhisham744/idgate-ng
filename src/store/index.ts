import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActiveAccount,
  ActorRef,
  CommunicationArea,
  ContactRequest,
  DelegationItem,
  EntityStatus,
  Group,
  LegalEntity,
  LinkRequest,
  Message,
  NoteKind,
  NoteStatus,
  Notification,
  Position,
  Post,
  Profile,
  StructureNode,
  TransactionKey,
  Vacancy,
  VirtualCharacter,
} from '@/types'
import { buildSeed } from '@/data/seed'
import type { AppData } from '@/data/seed'
import { actorKey, colorFor, mergedPermission, uid } from '@/lib/identity'
import { TRANSACTIONS, makeInternalCode } from '@/data/reference'

// ─────────────────────────────────────────────────────────────────────────────
// Derived-helper (pure) — resolve what an active account is allowed to do.
// ─────────────────────────────────────────────────────────────────────────────
export type Ability = 'create' | 'change' | 'display' | 'delete'

/** Payload collected by the new-account KYC wizard. */
export interface NewNormalInput {
  firstName: string
  surname: string
  gender: 'Male' | 'Female'
  dateOfBirth?: string
  nationality?: import('@/types').Country
  residenceCountry?: import('@/types').Country
  city: string
  nationalId?: string
  mobile: string
  email?: string
  landline?: string
  linkedIn?: string
  facebook?: string
  whatsApp?: string
  motherTongue?: import('@/types').Language
  languages?: { language: import('@/types').Language; level: 'Basic' | 'Average' | 'Fluent' }[]
  education?: { school?: string; university?: string; postgraduate?: string; phd?: string }
  career?: { title?: string; profession?: string; field?: string; industry?: string; history?: string }
  verification: import('@/types').VerificationInfo
}

interface State extends AppData {
  // session
  normalId: string | null
  active: ActiveAccount | null
  onboarded: boolean
  /** User-level presence, keyed by normalId (persists across account switches). */
  presenceByNormal: Record<string, import('@/types').Presence>

  // ── selectors ──────────────────────────────────────────────────────────────
  currentNormal: () => import('@/types').NormalCharacter | undefined
  virtualsFor: (normalId: string) => VirtualCharacter[]
  /** All actorKeys the signed-in person acts through: personal + every owned virtual. */
  myActorKeys: () => string[]
  /** The signed-in person's presence (defaults to 'active'). */
  myPresence: () => import('@/types').Presence
  entity: (id: string) => LegalEntity | undefined
  virtual: (id: string) => VirtualCharacter | undefined
  profilesForVirtual: (v: VirtualCharacter) => Profile[]
  can: (key: TransactionKey, ability?: Ability) => boolean
  /** The communication area an actor belongs to (via its entity); undefined for personal accounts. */
  areaOf: (ref: ActorRef) => string | undefined
  /** Whether two actors may communicate: personal accounts are universal; two virtuals need a shared area. */
  canCommunicate: (a: ActorRef, b: ActorRef) => boolean
  /** Resolve a group's membership criteria + explicit members into concrete recipients. */
  groupRecipients: (groupId: string) => ActorRef[]

  // ── session actions ──────────────────────────────────────────────────────────
  signIn: (normalId: string) => void
  /** Create a freshly-proofed personal account (KYC) and sign in as it. Returns the new id. */
  registerNormal: (input: NewNormalInput) => string
  /** Find an existing person colliding on mobile OR (nationalId + nationality). */
  findDuplicateNormal: (mobile: string, nationalId: string | undefined, nationality: import('@/types').Country) => import('@/types').NormalCharacter | undefined
  /** Persist edits to a natural person's master data. */
  updateNormal: (id: string, patch: Partial<import('@/types').NormalCharacter>) => void
  logout: () => void
  setActive: (a: ActiveAccount) => void
  setOnboarded: (v: boolean) => void
  setPresence: (p: import('@/types').Presence) => void

  // ── posts ─────────────────────────────────────────────────────────────────────
  addPost: (body: string, category: Post['category']) => void
  reactPost: (postId: string) => void
  savePost: (postId: string) => void
  commentPost: (postId: string, body: string) => void

  // ── messages ────────────────────────────────────────────────────────────────
  sendMessage: (input: {
    to: ActorRef[]
    cc?: ActorRef[]
    bcc?: ActorRef[]
    subject: string
    body: string
    attachments?: import('@/types').AttachmentMeta[]
    threadId?: string
  }) => void
  forwardMessage: (input: {
    source: Message
    to: ActorRef[]
    cc?: ActorRef[]
    bcc?: ActorRef[]
    body?: string
    attachments?: import('@/types').AttachmentMeta[]
  }) => void
  deleteMessage: (messageId: string) => void
  markRead: (messageId: string) => void

  // ── notifications ─────────────────────────────────────────────────────────────
  createNotification: (n: {
    kind: NoteKind
    to: ActorRef[]
    subject: string
    body: string
    targetDate?: string
    targetTime?: string
    targetVenue?: string
    evalType?: import('@/types').Notification['evalType']
    ballot?: string[]
    attachments?: import('@/types').AttachmentMeta[]
  }) => void
  /** A recipient changes their own reaction (optionally with a clarification text). */
  respondNotification: (id: string, recipientKey: string, status: NoteStatus, text?: string) => void
  /** A valuation recipient sets their rating. */
  rateNotification: (id: string, recipientKey: string, rating: import('@/types').RatingKey) => void
  /** A voting/election recipient sets one ballot item's choice. */
  setBallotChoice: (id: string, recipientKey: string, index: number, choice: 'agree' | 'disagree') => void
  /** Post a message into one recipient's private thread (sender reply or recipient follow-up). */
  postNoteMessage: (
    id: string,
    recipientKey: string,
    text: string,
    attachments?: import('@/types').AttachmentMeta[],
  ) => void
  /** Sender edits the note envelope; records a system entry in every thread. */
  editNotification: (
    id: string,
    patch: { subject?: string; body?: string; targetDate?: string; targetTime?: string; targetVenue?: string },
  ) => void
  /** Sender freezes the note — locks all reactions/messages. */
  freezeNotification: (id: string) => void
  voteNotification: (id: string, choice: 'accept' | 'reject') => void
  markNotificationRead: (id: string) => void
  /** Mark all entries in one recipient's thread as read by the active account. */
  markNoteThreadRead: (id: string, recipientKey: string) => void

  // ── vacancies ───────────────────────────────────────────────────────────────
  postVacancy: (v: Omit<Vacancy, 'id' | 'createdAt' | 'applicants' | 'postedByVirtualId'>) => void
  applyVacancy: (vacancyId: string) => void

  // ── contact / link ────────────────────────────────────────────────────────────
  sendContactRequest: (to: ActorRef) => void
  respondContactRequest: (id: string, status: 'accepted' | 'rejected') => void
  createLinkRequest: (entityId: string, virtualId: string, targetNormalId: string) => void
  respondLinkRequest: (id: string, status: 'accepted' | 'rejected') => void

  // ── groups ─────────────────────────────────────────────────────────────────
  addGroup: (g: Omit<Group, 'id'>) => string
  updateGroup: (id: string, patch: Partial<Group>) => void
  removeGroup: (id: string) => void

  // ── communication areas ──────────────────────────────────────────────────────
  addCommunicationArea: (name: string) => string
  removeCommunicationArea: (id: string) => void

  // ── master data: entities & structures ─────────────────────────────────────────
  registerEntity: (e: Omit<LegalEntity, 'id' | 'status'> & { status?: EntityStatus }) => string
  updateEntity: (id: string, patch: Partial<LegalEntity>) => void
  activateEntity: (id: string) => void
  addStructureNode: (n: Omit<StructureNode, 'id'>) => string
  removeStructureNode: (id: string) => void
  /** Rename a structure node in place. */
  renameStructureNode: (id: string, name: string) => void
  addProfile: (p: Omit<Profile, 'id'>) => string
  updateProfile: (id: string, patch: Partial<Profile>) => void
  removeProfile: (id: string) => void
  addDelegation: (d: Omit<DelegationItem, 'id'>) => void
  updateDelegation: (id: string, patch: Partial<DelegationItem>) => void
  addPosition: (entityId: string, name: string) => string
  addVirtual: (v: Omit<VirtualCharacter, 'id' | 'createdAt' | 'status'>) => string
  updateVirtual: (id: string, patch: Partial<VirtualCharacter>) => void
  linkVirtual: (virtualId: string, normalId: string) => void
  unlinkVirtual: (virtualId: string) => void
  blockVirtual: (virtualId: string, blocked: boolean) => void

  // ── util ────────────────────────────────────────────────────────────────────
  reset: () => void
}

const seed = buildSeed()

/** De-duplicate a list of actor refs by their stable key, preserving order. */
function dedupeRefs(refs: ActorRef[]): ActorRef[] {
  const seen = new Set<string>()
  const out: ActorRef[] = []
  for (const r of refs) {
    const k = actorKey(r)
    if (!seen.has(k)) {
      seen.add(k)
      out.push(r)
    }
  }
  return out
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...seed,
      normalId: null,
      active: null,
      onboarded: false,
      presenceByNormal: {},

      // ── selectors ────────────────────────────────────────────────────────────
      currentNormal: () => get().normals.find((n) => n.id === get().normalId),
      virtualsFor: (normalId) => get().virtuals.filter((v) => v.linkedNormalId === normalId),
      myActorKeys: () => {
        const { normalId } = get()
        if (!normalId) return []
        return [`n:${normalId}`, ...get().virtualsFor(normalId).map((v) => `v:${v.id}`)]
      },
      myPresence: () => {
        const { normalId, presenceByNormal } = get()
        return (normalId && presenceByNormal[normalId]) || 'active'
      },
      entity: (id) => get().entities.find((e) => e.id === id),
      virtual: (id) => get().virtuals.find((v) => v.id === id),
      profilesForVirtual: (v) => get().profiles.filter((p) => v.profileIds.includes(p.id)),
      can: (key, ability = 'create') => {
        const { active } = get()
        if (!active) return false
        if (active.kind === 'normal') {
          // personal account: ungoverned for personal-createable transactions.
          if (ability === 'create') {
            const def = TRANSACTIONS.find((t) => t.key === key)
            return def ? def.personalCanCreate : false
          }
          return true // personal can display/change/delete its own artefacts
        }
        const v = get().virtual(active.virtualId)
        if (!v || v.status !== 'active') return false
        const profs = get().profilesForVirtual(v)
        return mergedPermission(profs, key)[ability]
      },
      areaOf: (ref) => {
        if (ref.kind !== 'virtual') return undefined
        const v = get().virtual(ref.virtualId)
        if (!v) return undefined
        return get().entity(v.entityId)?.communicationAreaId
      },
      canCommunicate: (a, b) => {
        // Personal (natural-person) accounts are universally reachable.
        if (a.kind === 'normal' || b.kind === 'normal') return true
        const aArea = get().areaOf(a)
        const bArea = get().areaOf(b)
        // Two virtuals must share a defined area. If either has no area, don't restrict (demo-friendly).
        if (!aArea || !bArea) return true
        return aArea === bArea
      },
      groupRecipients: (groupId) => {
        const s = get()

        // Set of node ids that a criterion "covers": the node itself + all descendants
        // (a group message reaches that node level and every level below it).
        const coverage = (rootId: string): Set<string> => {
          const kin = s.structures
          const out = new Set<string>([rootId])
          let changed = true
          while (changed) {
            changed = false
            for (const n of kin) {
              if (n.parentId && out.has(n.parentId) && !out.has(n.id)) {
                out.add(n.id)
                changed = true
              }
            }
          }
          return out
        }

        const keys = new Set<string>()
        const out: ActorRef[] = []
        const push = (ref: ActorRef) => {
          const k = ref.kind === 'virtual' ? `v:${ref.virtualId}` : `n:${ref.normalId}`
          if (!keys.has(k)) {
            keys.add(k)
            out.push(ref)
          }
        }

        // Resolve one group, recursing into member groups (cycle-guarded).
        const visited = new Set<string>()
        const walk = (gid: string) => {
          if (visited.has(gid)) return
          visited.add(gid)
          const g = s.groups.find((x) => x.id === gid)
          if (!g) return

          const posNames = g.positionNames ?? (g.positionName ? [g.positionName] : [])
          const cov = {
            corporate: g.corporateNodeId ? coverage(g.corporateNodeId) : null,
            relation: g.relationNodeId ? coverage(g.relationNodeId) : null,
            organization: g.organizationNodeId ? coverage(g.organizationNodeId) : null,
            geographical: g.geographicalNodeId ? coverage(g.geographicalNodeId) : null,
          }
          const hasCriteria =
            posNames.length > 0 || !!cov.corporate || !!cov.relation || !!cov.organization || !!cov.geographical

          // criteria-matched active virtuals in the same entity
          if (hasCriteria) {
            for (const v of s.virtuals) {
              if (v.entityId !== g.entityId || v.status !== 'active') continue
              if (posNames.length && !posNames.includes(v.positionName)) continue
              if (cov.corporate && !(v.structure.corporate && cov.corporate.has(v.structure.corporate))) continue
              if (cov.relation && !(v.structure.relation && cov.relation.has(v.structure.relation))) continue
              if (cov.organization && !(v.structure.organization && cov.organization.has(v.structure.organization))) continue
              if (cov.geographical && !(v.structure.geographical && cov.geographical.has(v.structure.geographical))) continue
              push({ kind: 'virtual', virtualId: v.id })
            }
          }

          // explicit members (always included)
          for (const id of g.explicitMemberIds ?? []) {
            if (s.virtuals.some((v) => v.id === id)) push({ kind: 'virtual', virtualId: id })
          }
          for (const nid of g.explicitNormalIds ?? []) {
            if (s.normals.some((n) => n.id === nid)) push({ kind: 'normal', normalId: nid })
          }
          // nested member groups
          for (const mg of g.memberGroupIds ?? []) walk(mg)
        }

        walk(groupId)
        return out
      },

      // ── session ────────────────────────────────────────────────────────────────
      signIn: (normalId) =>
        set({ normalId, active: { kind: 'normal', normalId }, onboarded: true }),
      findDuplicateNormal: (mobile, nationalId, nationality) => {
        const m = (mobile || '').replace(/\s+/g, '')
        const nid = (nationalId || '').trim()
        return get().normals.find((n) => {
          const sameMobile = m && n.contacts.mobile.replace(/\s+/g, '') === m
          const sameId = nid && n.nationalId?.trim() === nid && n.nationalities[0] === nationality
          return sameMobile || sameId
        })
      },
      registerNormal: (input) => {
        // Prevent duplicate accounts (mobile OR nationalId+nationality).
        const nationality = input.nationality ?? 'Egypt'
        if (get().findDuplicateNormal(input.mobile, input.nationalId, nationality)) return ''
        const id = uid('n')
        const fullName = `${input.firstName} ${input.surname}`.trim()
        const seq = get().normals.length + 1
        const person: import('@/types').NormalCharacter = {
          id,
          firstName: input.firstName.trim(),
          surname: input.surname.trim(),
          fullName,
          gender: input.gender,
          dateOfBirth: input.dateOfBirth,
          nationalities: [nationality],
          residenceCountry: input.residenceCountry ?? nationality,
          city: input.city.trim(),
          nationalId: input.nationalId?.trim() || undefined,
          internalCode: makeInternalCode(nationality, input.city, seq),
          motherTongue: input.motherTongue ?? 'Arabic',
          languages: input.languages,
          education: input.education,
          career: input.career,
          contacts: {
            mobile: input.mobile.trim(),
            email: input.email?.trim() || undefined,
            landline: input.landline?.trim() || undefined,
            linkedIn: input.linkedIn?.trim() || undefined,
            facebook: input.facebook?.trim() || undefined,
            whatsApp: input.whatsApp?.trim() || undefined,
          },
          verification: input.verification,
          privacy: { personalInfo: 'contacts', contactsInfo: 'contacts', education: 'public', career: 'public' },
          avatarColor: colorFor(fullName || id),
        }
        set((s) => ({
          normals: [...s.normals, person],
          normalId: id,
          active: { kind: 'normal', normalId: id },
          onboarded: true,
        }))
        return id
      },
      updateNormal: (id, patch) =>
        set((s) => ({ normals: s.normals.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),
      logout: () => set({ normalId: null, active: null }),
      setActive: (active) => set({ active }),
      setOnboarded: (onboarded) => set({ onboarded }),
      setPresence: (p) => {
        const { normalId } = get()
        if (!normalId) return
        set((s) => ({ presenceByNormal: { ...s.presenceByNormal, [normalId]: p } }))
      },

      // ── posts ──────────────────────────────────────────────────────────────────
      addPost: (body, category) => {
        const { active } = get()
        if (!active) return
        const post: Post = {
          id: uid('post'),
          author: active as ActorRef,
          body,
          category,
          createdAt: new Date().toISOString(),
          reactions: 0,
          comments: [],
          reactedBy: [],
          savedBy: [],
        }
        set((s) => ({ posts: [post, ...s.posts] }))
      },
      reactPost: (postId) => {
        const { active } = get()
        if (!active) return
        const k = actorKey(active)
        set((s) => ({
          posts: s.posts.map((p) => {
            if (p.id !== postId) return p
            const has = p.reactedBy.includes(k)
            return {
              ...p,
              reactedBy: has ? p.reactedBy.filter((x) => x !== k) : [...p.reactedBy, k],
              reactions: p.reactions + (has ? -1 : 1),
            }
          }),
        }))
      },
      savePost: (postId) => {
        const { active } = get()
        if (!active) return
        const k = actorKey(active)
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? { ...p, savedBy: p.savedBy.includes(k) ? p.savedBy.filter((x) => x !== k) : [...p.savedBy, k] }
              : p,
          ),
        }))
      },
      commentPost: (postId, body) => {
        const { active } = get()
        if (!active || !body.trim()) return
        set((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [
                    ...p.comments,
                    { id: uid('c'), author: active as ActorRef, body, createdAt: new Date().toISOString() },
                  ],
                }
              : p,
          ),
        }))
      },

      // ── messages ─────────────────────────────────────────────────────────────
      sendMessage: ({ to, cc, bcc, subject, body, attachments, threadId }) => {
        const { active } = get()
        if (!active) return
        const clean = (arr?: ActorRef[]) => (arr && arr.length ? dedupeRefs(arr) : undefined)
        const msg: Message = {
          id: uid('m'),
          threadId: threadId ?? uid('t'),
          from: active as ActorRef,
          to: dedupeRefs(to),
          cc: clean(cc),
          bcc: clean(bcc),
          subject,
          body,
          createdAt: new Date().toISOString(),
          readBy: [actorKey(active)],
          savedBy: [],
          attachments: attachments && attachments.length ? attachments : undefined,
        }
        set((s) => ({ messages: [msg, ...s.messages] }))
      },
      forwardMessage: ({ source, to, cc, bcc, body, attachments }) => {
        const { active } = get()
        if (!active) return
        const clean = (arr?: ActorRef[]) => (arr && arr.length ? dedupeRefs(arr) : undefined)
        const subject = source.subject.startsWith('Fwd: ') ? source.subject : `Fwd: ${source.subject}`
        const quoted = `\n\n——————\n${source.body}`
        // Carry the original's attachments and append any the user adds while forwarding.
        const merged = [...(source.attachments ?? []), ...(attachments ?? [])]
        const msg: Message = {
          id: uid('m'),
          threadId: uid('t'),
          from: active as ActorRef,
          to: dedupeRefs(to),
          cc: clean(cc),
          bcc: clean(bcc),
          subject,
          body: (body?.trim() ? body.trim() : '') + quoted,
          createdAt: new Date().toISOString(),
          readBy: [actorKey(active)],
          savedBy: [],
          attachments: merged.length ? merged : undefined,
        }
        set((s) => ({ messages: [msg, ...s.messages] }))
      },
      deleteMessage: (messageId) => {
        const { active } = get()
        if (!active) return
        const k = actorKey(active)
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId && !(m.deletedBy ?? []).includes(k)
              ? { ...m, deletedBy: [...(m.deletedBy ?? []), k] }
              : m,
          ),
        }))
      },
      markRead: (messageId) => {
        const { active } = get()
        if (!active) return
        const k = actorKey(active)
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === messageId && !m.readBy.includes(k) ? { ...m, readBy: [...m.readBy, k] } : m,
          ),
        }))
      },

      // ── notifications ──────────────────────────────────────────────────────────
      createNotification: ({ kind, to, subject, body, targetDate, targetTime, targetVenue, evalType, ballot, attachments }) => {
        const { active } = get()
        if (!active) return
        const RESPONSE = ['task', 'calendar', 'offer', 'voting', 'event', 'training', 'tender', 'meeting', 'conference', 'valuation', 'election']
        const cleanBallot = ballot?.map((b) => b.trim()).filter(Boolean)
        const recipients = dedupeRefs(to).map((ref) => ({
          ref,
          status: 'pending' as NoteStatus,
          thread: [],
          ...(cleanBallot && cleanBallot.length ? { ballotChoices: cleanBallot.map(() => null) } : {}),
        }))
        const note: Notification = {
          id: uid('nt'),
          kind,
          from: active as ActorRef,
          to: recipients.map((r) => r.ref),
          subject,
          body,
          createdAt: new Date().toISOString(),
          targetDate,
          targetTime,
          targetVenue,
          evalType,
          ballot: cleanBallot && cleanBallot.length ? cleanBallot : undefined,
          attachments: attachments && attachments.length ? attachments : undefined,
          needsResponse: RESPONSE.includes(kind),
          status: 'pending',
          recipients,
          frozen: false,
          votes: kind === 'voting' ? { accept: 0, reject: 0 } : undefined,
          readBy: [],
          history: [],
        }
        set((s) => ({ notifications: [note, ...s.notifications] }))
      },
      respondNotification: (id, recipientKey, status, text) => {
        const { active } = get()
        if (!active) return
        const at = new Date().toISOString()
        set((s) => ({
          notifications: s.notifications.map((n) => {
            if (n.id !== id || n.frozen) return n
            const recipients = (n.recipients ?? []).map((rc) => {
              if (actorKey(rc.ref) !== recipientKey || rc.status === 'closed') return rc
              // Authored AS the recipient — correct even when acted from a user-level list.
              const entries = [
                ...rc.thread,
                {
                  id: uid('nte'),
                  at,
                  by: rc.ref,
                  type: 'status' as const,
                  status,
                  readBy: [actorKey(rc.ref)],
                },
                ...(text
                  ? [
                      {
                        id: uid('nte'),
                        at,
                        by: rc.ref,
                        type: 'message' as const,
                        text,
                        readBy: [actorKey(rc.ref)],
                      },
                    ]
                  : []),
              ]
              return { ...rc, status, thread: entries }
            })
            return { ...n, recipients }
          }),
        }))
      },
      rateNotification: (id, recipientKey, rating) => {
        const { active } = get()
        if (!active) return
        set((s) => ({
          notifications: s.notifications.map((n) => {
            if (n.id !== id || n.frozen) return n
            const recipients = (n.recipients ?? []).map((rc) =>
              actorKey(rc.ref) !== recipientKey || rc.status === 'closed' ? rc : { ...rc, rating },
            )
            return { ...n, recipients }
          }),
        }))
      },
      setBallotChoice: (id, recipientKey, index, choice) => {
        const { active } = get()
        if (!active) return
        set((s) => ({
          notifications: s.notifications.map((n) => {
            if (n.id !== id || n.frozen) return n
            const recipients = (n.recipients ?? []).map((rc) => {
              if (actorKey(rc.ref) !== recipientKey || rc.status === 'closed') return rc
              const len = n.ballot?.length ?? 0
              const base = rc.ballotChoices ?? Array.from({ length: len }, () => null)
              const next = base.slice()
              next[index] = choice
              return { ...rc, ballotChoices: next }
            })
            return { ...n, recipients }
          }),
        }))
      },
      postNoteMessage: (id, recipientKey, text, attachments) => {
        const { active } = get()
        if (!active || !text.trim()) return
        const at = new Date().toISOString()
        set((s) => ({
          notifications: s.notifications.map((n) => {
            if (n.id !== id || n.frozen) return n
            const recipients = (n.recipients ?? []).map((rc) => {
              if (actorKey(rc.ref) !== recipientKey || rc.status === 'closed') return rc
              return {
                ...rc,
                thread: [
                  ...rc.thread,
                  {
                    id: uid('nte'),
                    at,
                    by: active as ActorRef,
                    type: 'message' as const,
                    text: text.trim(),
                    attachments: attachments && attachments.length ? attachments : undefined,
                    readBy: [actorKey(active)],
                  },
                ],
              }
            })
            return { ...n, recipients }
          }),
        }))
      },
      editNotification: (id, patch) => {
        const { active } = get()
        if (!active) return
        const at = new Date().toISOString()
        set((s) => ({
          notifications: s.notifications.map((n) => {
            if (n.id !== id || n.frozen) return n
            const sysEntry = {
              id: uid('nte'),
              at,
              by: active as ActorRef,
              type: 'system' as const,
              text: 'edited',
              readBy: [actorKey(active)],
            }
            const recipients = (n.recipients ?? []).map((rc) => ({
              ...rc,
              thread: [...rc.thread, sysEntry],
            }))
            return {
              ...n,
              subject: patch.subject ?? n.subject,
              body: patch.body ?? n.body,
              targetDate: patch.targetDate !== undefined ? patch.targetDate || undefined : n.targetDate,
              targetTime: patch.targetTime !== undefined ? patch.targetTime || undefined : n.targetTime,
              targetVenue: patch.targetVenue !== undefined ? patch.targetVenue || undefined : n.targetVenue,
              recipients,
            }
          }),
        }))
      },
      freezeNotification: (id) => {
        const { active } = get()
        if (!active) return
        const at = new Date().toISOString()
        set((s) => ({
          notifications: s.notifications.map((n) => {
            if (n.id !== id || n.frozen) return n
            const sysEntry = {
              id: uid('nte'),
              at,
              by: active as ActorRef,
              type: 'system' as const,
              text: 'frozen',
              readBy: [actorKey(active)],
            }
            const recipients = (n.recipients ?? []).map((rc) => ({
              ...rc,
              thread: [...rc.thread, sysEntry],
            }))
            return { ...n, frozen: true, recipients }
          }),
        }))
      },
      voteNotification: (id, choice) => {
        const { active } = get()
        if (!active) return
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id && n.kind === 'voting'
              ? {
                  ...n,
                  votes: {
                    accept: (n.votes?.accept ?? 0) + (choice === 'accept' ? 1 : 0),
                    reject: (n.votes?.reject ?? 0) + (choice === 'reject' ? 1 : 0),
                  },
                  history: [...n.history, { at: new Date().toISOString(), by: active as ActorRef, action: `vote:${choice}` }],
                }
              : n,
          ),
        }))
      },
      markNotificationRead: (id) => {
        const { active } = get()
        if (!active) return
        const k = actorKey(active)
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id && !(n.readBy ?? []).includes(k)
              ? { ...n, readBy: [...(n.readBy ?? []), k] }
              : n,
          ),
        }))
      },
      markNoteThreadRead: (id, recipientKey) => {
        const { active } = get()
        if (!active) return
        const k = actorKey(active)
        set((s) => ({
          notifications: s.notifications.map((n) => {
            if (n.id !== id) return n
            const recipients = (n.recipients ?? []).map((rc) => {
              if (actorKey(rc.ref) !== recipientKey) return rc
              return {
                ...rc,
                thread: rc.thread.map((e) =>
                  (e.readBy ?? []).includes(k) ? e : { ...e, readBy: [...(e.readBy ?? []), k] },
                ),
              }
            })
            return { ...n, recipients }
          }),
        }))
      },

      // ── vacancies ──────────────────────────────────────────────────────────────
      postVacancy: (v) => {
        const { active } = get()
        if (!active || active.kind !== 'virtual') return
        const vac: Vacancy = {
          ...v,
          id: uid('vac'),
          postedByVirtualId: active.virtualId,
          createdAt: new Date().toISOString(),
          applicants: [],
        }
        set((s) => ({ vacancies: [vac, ...s.vacancies] }))
      },
      applyVacancy: (vacancyId) => {
        const { normalId } = get()
        if (!normalId) return
        set((s) => ({
          vacancies: s.vacancies.map((v) =>
            v.id === vacancyId && !v.applicants.includes(normalId)
              ? { ...v, applicants: [...v.applicants, normalId] }
              : v,
          ),
        }))
      },

      // ── contact / link ───────────────────────────────────────────────────────
      sendContactRequest: (to) => {
        const { active } = get()
        if (!active) return
        const cr: ContactRequest = {
          id: uid('cr'),
          from: active as ActorRef,
          to,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ contactRequests: [cr, ...s.contactRequests] }))
      },
      respondContactRequest: (id, status) =>
        set((s) => ({ contactRequests: s.contactRequests.map((c) => (c.id === id ? { ...c, status } : c)) })),
      createLinkRequest: (entityId, virtualId, targetNormalId) => {
        const lr: LinkRequest = {
          id: uid('lr'),
          entityId,
          virtualId,
          targetNormalId,
          direction: 'entity-to-person',
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
        set((s) => ({ linkRequests: [lr, ...s.linkRequests] }))
      },
      respondLinkRequest: (id, status) => {
        const lr = get().linkRequests.find((l) => l.id === id)
        if (!lr) return
        if (status === 'accepted') get().linkVirtual(lr.virtualId, lr.targetNormalId)
        set((s) => ({ linkRequests: s.linkRequests.map((l) => (l.id === id ? { ...l, status } : l)) }))
      },

      // ── groups ────────────────────────────────────────────────────────────────
      addGroup: (g) => {
        const id = uid('g')
        set((s) => ({ groups: [{ ...g, id }, ...s.groups] }))
        return id
      },
      updateGroup: (id, patch) =>
        set((s) => ({ groups: s.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      removeGroup: (id) => set((s) => ({ groups: s.groups.filter((g) => g.id !== id) })),

      // ── communication areas ─────────────────────────────────────────────────────
      addCommunicationArea: (name) => {
        const id = uid('ca')
        const owner = get().normalId ?? undefined
        set((s) => ({ communicationAreas: [...s.communicationAreas, { id, name: name.trim(), createdByNormalId: owner }] }))
        return id
      },
      removeCommunicationArea: (id) =>
        set((s) => ({ communicationAreas: s.communicationAreas.filter((a) => a.id !== id) })),

      // ── master data ─────────────────────────────────────────────────────────────
      registerEntity: (e) => {
        const id = uid('e')
        const entity: LegalEntity = { ...e, id, status: e.status ?? 'draft' }
        set((s) => ({ entities: [...s.entities, entity] }))
        return id
      },
      updateEntity: (id, patch) =>
        set((s) => ({ entities: s.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      activateEntity: (id) =>
        set((s) => ({ entities: s.entities.map((e) => (e.id === id ? { ...e, status: 'active' } : e)) })),
      addStructureNode: (n) => {
        const id = uid('sn')
        set((s) => ({ structures: [...s.structures, { ...n, id }] }))
        return id
      },
      removeStructureNode: (id) =>
        set((s) => {
          // cascade: remove node and descendants
          const toRemove = new Set<string>([id])
          let changed = true
          while (changed) {
            changed = false
            for (const n of s.structures) {
              if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) {
                toRemove.add(n.id)
                changed = true
              }
            }
          }
          return { structures: s.structures.filter((n) => !toRemove.has(n.id)) }
        }),
      renameStructureNode: (id, name) =>
        set((s) => ({ structures: s.structures.map((n) => (n.id === id ? { ...n, name } : n)) })),
      addProfile: (p) => {
        const id = uid('p')
        set((s) => ({ profiles: [...s.profiles, { ...p, id }] }))
        return id
      },
      updateProfile: (id, patch) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      removeProfile: (id) => set((s) => ({ profiles: s.profiles.filter((p) => p.id !== id) })),
      addDelegation: (d) => set((s) => ({ delegations: [...s.delegations, { ...d, id: uid('d') }] })),
      updateDelegation: (id, patch) =>
        set((s) => ({ delegations: s.delegations.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      addPosition: (entityId, name) => {
        const id = uid('pos')
        const pos: Position = { id, entityId, name }
        set((s) => ({ positions: [...s.positions, pos] }))
        return id
      },
      addVirtual: (v) => {
        const id = uid('v')
        const vc: VirtualCharacter = {
          ...v,
          id,
          createdAt: new Date().toISOString(),
          status: v.linkedNormalId ? 'active' : 'unlinked',
        }
        set((s) => ({ virtuals: [...s.virtuals, vc] }))
        return id
      },
      updateVirtual: (id, patch) =>
        set((s) => ({ virtuals: s.virtuals.map((v) => (v.id === id ? { ...v, ...patch } : v)) })),
      linkVirtual: (virtualId, normalId) =>
        set((s) => ({
          virtuals: s.virtuals.map((v) =>
            v.id === virtualId
              ? { ...v, linkedNormalId: normalId, status: 'active', connectedAt: new Date().toISOString(), disconnectedAt: undefined }
              : v,
          ),
        })),
      unlinkVirtual: (virtualId) =>
        set((s) => ({
          virtuals: s.virtuals.map((v) =>
            v.id === virtualId ? { ...v, linkedNormalId: null, status: 'unlinked', disconnectedAt: new Date().toISOString() } : v,
          ),
        })),
      blockVirtual: (virtualId, blocked) =>
        set((s) => ({
          virtuals: s.virtuals.map((v) =>
            v.id === virtualId
              ? { ...v, status: blocked ? 'blocked' : v.linkedNormalId ? 'active' : 'unlinked' }
              : v,
          ),
        })),

      reset: () => set({ ...buildSeed(), normalId: null, active: null, onboarded: false }),
    }),
    {
      name: 'idgate.app',
      version: 4,
      // v2: notifications gained per-recipient status + private threads.
      // v3: added communicationAreas; groups gained positionNames[] (from single positionName).
      // v4: structure node codes are strings (hierarchical); coerce any legacy numeric codes.
      migrate: (persisted: any, from: number) => {
        if (persisted && from < 2 && Array.isArray(persisted.notifications)) {
          const valid = ['pending', 'accepted', 'rejected', 'clarify', 'closed']
          const norm = (s: any): NoteStatus =>
            s === 'completed' ? 'closed' : valid.includes(s) ? s : 'pending'
          persisted.notifications = persisted.notifications.map((n: any) => {
            if (n.recipients) return { ...n, status: norm(n.status) }
            const recipients = (n.to ?? []).map((ref: any) => ({
              ref,
              status: norm(n.status),
              thread: [],
            }))
            return { ...n, status: norm(n.status), recipients, frozen: n.frozen ?? false }
          })
        }
        if (persisted && from < 3) {
          if (!Array.isArray(persisted.communicationAreas)) persisted.communicationAreas = []
          if (Array.isArray(persisted.groups)) {
            persisted.groups = persisted.groups.map((g: any) =>
              g.positionNames ? g : { ...g, positionNames: g.positionName ? [g.positionName] : [] },
            )
          }
        }
        if (persisted && from < 4 && Array.isArray(persisted.structures)) {
          persisted.structures = persisted.structures.map((n: any) =>
            typeof n.code === 'number' ? { ...n, code: String(n.code) } : n,
          )
        }
        return persisted
      },
      // Persist everything; strip attachment preview blobs (dataUrl) before writing so
      // large files don't blow the localStorage quota — metadata (name/size/type) is kept.
      partialize: (state) => ({
        ...state,
        normals: state.normals.map((n) =>
          n.career?.cv?.dataUrl
            ? { ...n, career: { ...n.career, cv: (({ dataUrl: _d, ...meta }) => meta)(n.career.cv) } }
            : n,
        ),
        messages: state.messages.map((m) =>
          m.attachments
            ? { ...m, attachments: m.attachments.map(({ dataUrl: _drop, ...meta }) => meta) }
            : m,
        ),
        notifications: state.notifications.map((n) => ({
          ...n,
          attachments: n.attachments?.map(({ dataUrl: _d, ...meta }) => meta),
          recipients: n.recipients?.map((rc) => ({
            ...rc,
            thread: rc.thread.map((e) =>
              e.attachments
                ? { ...e, attachments: e.attachments.map(({ dataUrl: _d2, ...meta }) => meta) }
                : e,
            ),
          })),
        })),
      }),
    },
  ),
)
