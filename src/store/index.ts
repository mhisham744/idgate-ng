import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ActiveAccount,
  ActorRef,
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
import { actorKey, mergedPermission, uid } from '@/lib/identity'
import { TRANSACTIONS } from '@/data/reference'

// ─────────────────────────────────────────────────────────────────────────────
// Derived-helper (pure) — resolve what an active account is allowed to do.
// ─────────────────────────────────────────────────────────────────────────────
export type Ability = 'create' | 'change' | 'display' | 'delete'

interface State extends AppData {
  // session
  normalId: string | null
  active: ActiveAccount | null
  onboarded: boolean

  // ── selectors ──────────────────────────────────────────────────────────────
  currentNormal: () => import('@/types').NormalCharacter | undefined
  virtualsFor: (normalId: string) => VirtualCharacter[]
  entity: (id: string) => LegalEntity | undefined
  virtual: (id: string) => VirtualCharacter | undefined
  profilesForVirtual: (v: VirtualCharacter) => Profile[]
  can: (key: TransactionKey, ability?: Ability) => boolean

  // ── session actions ──────────────────────────────────────────────────────────
  signIn: (normalId: string) => void
  logout: () => void
  setActive: (a: ActiveAccount) => void
  setOnboarded: (v: boolean) => void

  // ── posts ─────────────────────────────────────────────────────────────────────
  addPost: (body: string, category: Post['category']) => void
  reactPost: (postId: string) => void
  savePost: (postId: string) => void
  commentPost: (postId: string, body: string) => void

  // ── messages ────────────────────────────────────────────────────────────────
  sendMessage: (to: ActorRef[], subject: string, body: string, threadId?: string) => void
  markRead: (messageId: string) => void

  // ── notifications ─────────────────────────────────────────────────────────────
  createNotification: (n: {
    kind: NoteKind
    to: ActorRef[]
    subject: string
    body: string
    targetDate?: string
  }) => void
  respondNotification: (id: string, status: NoteStatus, note?: string) => void
  voteNotification: (id: string, choice: 'accept' | 'reject') => void

  // ── vacancies ───────────────────────────────────────────────────────────────
  postVacancy: (v: Omit<Vacancy, 'id' | 'createdAt' | 'applicants' | 'postedByVirtualId'>) => void
  applyVacancy: (vacancyId: string) => void

  // ── contact / link ────────────────────────────────────────────────────────────
  sendContactRequest: (to: ActorRef) => void
  respondContactRequest: (id: string, status: 'accepted' | 'rejected') => void
  createLinkRequest: (entityId: string, virtualId: string, targetNormalId: string) => void
  respondLinkRequest: (id: string, status: 'accepted' | 'rejected') => void

  // ── groups ─────────────────────────────────────────────────────────────────
  addGroup: (g: Omit<Group, 'id'>) => void

  // ── master data: entities & structures ─────────────────────────────────────────
  registerEntity: (e: Omit<LegalEntity, 'id' | 'status'> & { status?: EntityStatus }) => string
  updateEntity: (id: string, patch: Partial<LegalEntity>) => void
  activateEntity: (id: string) => void
  addStructureNode: (n: Omit<StructureNode, 'id'>) => string
  removeStructureNode: (id: string) => void
  addProfile: (p: Omit<Profile, 'id'>) => string
  updateProfile: (id: string, patch: Partial<Profile>) => void
  addDelegation: (d: Omit<DelegationItem, 'id'>) => void
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

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...seed,
      normalId: null,
      active: null,
      onboarded: false,

      // ── selectors ────────────────────────────────────────────────────────────
      currentNormal: () => get().normals.find((n) => n.id === get().normalId),
      virtualsFor: (normalId) => get().virtuals.filter((v) => v.linkedNormalId === normalId),
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

      // ── session ────────────────────────────────────────────────────────────────
      signIn: (normalId) =>
        set({ normalId, active: { kind: 'normal', normalId }, onboarded: true }),
      logout: () => set({ normalId: null, active: null }),
      setActive: (active) => set({ active }),
      setOnboarded: (onboarded) => set({ onboarded }),

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
      sendMessage: (to, subject, body, threadId) => {
        const { active } = get()
        if (!active) return
        const msg: Message = {
          id: uid('m'),
          threadId: threadId ?? uid('t'),
          from: active as ActorRef,
          to,
          subject,
          body,
          createdAt: new Date().toISOString(),
          readBy: [actorKey(active)],
          savedBy: [],
        }
        set((s) => ({ messages: [msg, ...s.messages] }))
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
      createNotification: ({ kind, to, subject, body, targetDate }) => {
        const { active } = get()
        if (!active) return
        const RESPONSE = ['task', 'calendar', 'offer', 'voting', 'event', 'training', 'tender', 'meeting', 'conference']
        const note: Notification = {
          id: uid('nt'),
          kind,
          from: active as ActorRef,
          to,
          subject,
          body,
          createdAt: new Date().toISOString(),
          targetDate,
          needsResponse: RESPONSE.includes(kind),
          status: 'pending',
          votes: kind === 'voting' ? { accept: 0, reject: 0 } : undefined,
          history: [],
        }
        set((s) => ({ notifications: [note, ...s.notifications] }))
      },
      respondNotification: (id, status, note) => {
        const { active } = get()
        if (!active) return
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id
              ? {
                  ...n,
                  status,
                  history: [
                    ...n.history,
                    { at: new Date().toISOString(), by: active as ActorRef, action: note ? `${status}: ${note}` : status },
                  ],
                }
              : n,
          ),
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
      addGroup: (g) => set((s) => ({ groups: [{ ...g, id: uid('g') }, ...s.groups] })),

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
      addProfile: (p) => {
        const id = uid('p')
        set((s) => ({ profiles: [...s.profiles, { ...p, id }] }))
        return id
      },
      updateProfile: (id, patch) =>
        set((s) => ({ profiles: s.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      addDelegation: (d) => set((s) => ({ delegations: [...s.delegations, { ...d, id: uid('d') }] })),
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
            v.id === virtualId ? { ...v, linkedNormalId: normalId, status: 'active' } : v,
          ),
        })),
      unlinkVirtual: (virtualId) =>
        set((s) => ({
          virtuals: s.virtuals.map((v) =>
            v.id === virtualId ? { ...v, linkedNormalId: null, status: 'unlinked' } : v,
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
      version: 1,
      // Persist everything; on load, if data arrays are somehow empty, reseed.
    },
  ),
)
