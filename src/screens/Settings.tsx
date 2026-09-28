import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang, useI18n } from '@/i18n'
import { useTheme } from '@/theme'
import { ActorLine, useResolveActor } from '@/components/identity'
import { AccountSwitcher, PresenceAvatar } from '@/components/AccountSwitcher'
import { actorKey } from '@/lib/identity'
import { Button, Card, Chip, Field, Input, Row, Select, SectionHeader, Sheet, Modal, Toggle } from '@/ui/primitives'
import type { ActorRef } from '@/types'
import {
  User,
  Building2,
  Users,
  UsersRound,
  UserPlus,
  ShieldCheck,
  Link2,
  Network,
  Search,
  Info,
  ChevronRight,
  ChevronDown,
  Languages,
  Sun,
  Moon,
  Inbox,
  RotateCcw,
  LogOut,
  Send,
} from 'lucide-react'

/** Settings menu — identity summary, navigation, language, danger zone, sign out. */
export function Settings() {
  const nav = useNavigate()
  const { lang, isRtl, t } = useLang()
  const setLang = useI18n((s) => s.setLang)
  const theme = useTheme((s) => s.theme)
  const toggleTheme = useTheme((s) => s.toggle)

  const normalId = useStore((s) => s.normalId)
  const currentNormal = useStore((s) => s.currentNormal)
  const virtualsFor = useStore((s) => s.virtualsFor)
  const logout = useStore((s) => s.logout)
  const reset = useStore((s) => s.reset)
  const active = useStore((s) => s.active)
  const presence = useStore((s) => s.myPresence())
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const sendContactRequest = useStore((s) => s.sendContactRequest)
  const canCommunicate = useStore((s) => s.canCommunicate)
  const inboxScope = useStore((s) => s.inboxScope())
  const setInboxScope = useStore((s) => s.setInboxScope)
  const resolve = useResolveActor()
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const me = currentNormal()
  const r = resolve(active)
  const roles = normalId ? virtualsFor(normalId) : []

  const [confirmReset, setConfirmReset] = useState(false)
  // Contact Request relocated from the Tools page; Delegation Display stays illustrative.
  const [sheet, setSheet] = useState<null | 'contact'>(null)
  const [contactQuery, setContactQuery] = useState('')
  const [contactSent, setContactSent] = useState(false)

  const contactRequests = useStore((s) => s.contactRequests)
  const meKey = active ? actorKey(active) : ''

  // Candidates for a NEW contact request: any person or active virtual, excluding
  // self and anyone already connected (accepted) or with a request pending either way.
  const contactCandidates = useMemo<{ key: string; ref: ActorRef }[]>(() => {
    const excluded = new Set<string>([meKey])
    for (const c of contactRequests) {
      if (c.status === 'rejected') continue
      if (actorKey(c.from) === meKey) excluded.add(actorKey(c.to))
      else if (actorKey(c.to) === meKey) excluded.add(actorKey(c.from))
    }
    const opts: { key: string; ref: ActorRef }[] = [
      ...normals.map((n) => ({ key: `n:${n.id}`, ref: { kind: 'normal', normalId: n.id } as ActorRef })),
      ...virtuals.filter((v) => v.status === 'active').map((v) => ({ key: `v:${v.id}`, ref: { kind: 'virtual', virtualId: v.id } as ActorRef })),
    ]
    const q = contactQuery.trim().toLowerCase()
    return opts.filter((o) => {
      if (excluded.has(o.key)) return false
      if (!q) return true
      const info = resolve(o.ref)
      const nrec = normals.find((x) => o.ref.kind === 'normal' && x.id === o.ref.normalId)
      return (
        info.displayName.toLowerCase().includes(q) ||
        (nrec?.internalCode ?? '').toLowerCase().includes(q) ||
        (nrec?.contacts.mobile ?? '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
      )
    })
  }, [normals, virtuals, meKey, contactRequests, contactQuery, resolve])

  const openSheet = (which: 'contact') => {
    setContactQuery('')
    setContactSent(false)
    setSheet(which)
  }

  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const Chevron = <ChevronRight size={18} className={isRtl ? 'rotate-180 text-slate-400' : 'text-slate-400'} />

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Identity header — tap to switch account (personal ↔ virtual identities) */}
      <Card className="p-1.5">
        <button
          onClick={() => setSwitcherOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-start transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
        >
          {active && <PresenceAvatar name={r.displayName} color={r.color} size={48} square={r.isVirtual} presence={presence} />}
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-slate-800">{r.displayName}</div>
            <div className="truncate font-address text-[11px] text-gate-700" dir="ltr"><bdi>{r.address}</bdi></div>
            <div className="mt-0.5 text-[11px] text-slate-500">
              {L(
                `${roles.length} hosted ${roles.length === 1 ? 'role' : 'roles'}`,
                `${roles.length} صفة مستضافة`,
              )}
              {me ? ` · ${me.city}, ${me.residenceCountry}` : ''}
            </div>
          </div>
          <ChevronDown size={20} className="shrink-0 text-slate-400" />
        </button>
      </Card>

      {/* Navigation */}
      <Card className="overflow-hidden divide-y divide-slate-100">
        <Row
          leading={<User size={20} className="text-gate-600" />}
          title={t('personalMasterData')}
          subtitle={L('Your natural-person master data', 'البيانات الرئيسية للشخص الطبيعي')}
          trailing={Chevron}
          onClick={() => nav('/settings/personal')}
        />
        <Row
          leading={<Network size={20} className="text-gate-600" />}
          title={L('Communication Area', 'منطقة التواصل')}
          subtitle={L('Areas that let organizations interoperate', 'مناطق تتيح تواصل المؤسسات')}
          trailing={Chevron}
          onClick={() => nav('/settings/communication-areas')}
        />
        <Row
          leading={<Building2 size={20} className="text-gate-600" />}
          title={t('myEntities')}
          subtitle={L('Legal entities you administer', 'الكيانات القانونية التي تديرها')}
          trailing={Chevron}
          onClick={() => nav('/settings/entities')}
        />
        <Row
          leading={<Link2 size={20} className="text-gate-600" />}
          title={L('Link Request', 'طلب ربط')}
          subtitle={L('Link a position to a person', 'ربط منصب بشخص')}
          trailing={Chevron}
          onClick={() => nav('/settings/link-position')}
        />
        <Row
          leading={<UserPlus size={20} className="text-gate-600" />}
          title={t('contactRequest')}
          subtitle={L('Ask to connect with a person or entity', 'اطلب التواصل مع شخص أو جهة')}
          trailing={Chevron}
          onClick={() => openSheet('contact')}
        />
        <Row
          leading={<Users size={20} className="text-gate-600" />}
          title={t('directory')}
          subtitle={L('Browse people & entities', 'تصفح الأشخاص والكيانات')}
          trailing={Chevron}
          onClick={() => nav('/directory')}
        />
        <Row
          leading={<UsersRound size={20} className="text-gate-600" />}
          title={t('groups')}
          subtitle={L('Build communication groups', 'إنشاء مجموعات تواصل')}
          trailing={Chevron}
          onClick={() => nav('/settings/groups')}
        />
        <Row
          leading={<ShieldCheck size={20} className="text-gate-600" />}
          title={L('Delegation Show', 'عرض التفويض')}
          subtitle={L('Share a delegation with an account', 'مشاركة تفويض مع حساب')}
          trailing={Chevron}
          onClick={() => nav('/settings/delegation-show')}
        />
        <Row
          leading={<Info size={20} className="text-gate-600" />}
          title={t('aboutConcept')}
          subtitle={L('How IDGate works', 'كيف تعمل IDGate')}
          trailing={Chevron}
          onClick={() => nav('/settings/about')}
        />
      </Card>

      {/* Preferences: language + appearance */}
      <div className="space-y-2">
        <SectionHeader title={L('Preferences', 'التفضيلات')} />
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Languages size={18} className="text-slate-400" />
              {t('language')}
            </div>
            <div className="flex gap-2">
              <Chip active={lang === 'en'} onClick={() => setLang('en')}>
                English
              </Chip>
              <Chip active={lang === 'ar'} onClick={() => setLang('ar')}>
                العربية
              </Chip>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              {theme === 'dark' ? <Moon size={18} className="text-slate-400" /> : <Sun size={18} className="text-slate-400" />}
              {L('Appearance', 'المظهر')}
            </div>
            <div className="flex gap-2">
              <Chip active={theme === 'light'} onClick={() => { if (theme !== 'light') toggleTheme() }}>
                {L('Light', 'فاتح')}
              </Chip>
              <Chip active={theme === 'dark'} onClick={() => { if (theme !== 'dark') toggleTheme() }}>
                {L('Dark', 'داكن')}
              </Chip>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <Inbox size={18} className="mt-0.5 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <div>{L('Unified inbox', 'صندوق موحّد')}</div>
                <div className="text-[11px] leading-snug text-slate-400">
                  {L(
                    'Show messages & notifications across all my identities. Off: only the active one.',
                    'إظهار الرسائل والتنبيهات عبر جميع هوياتي. إيقاف: الهوية النشطة فقط.',
                  )}
                </div>
              </div>
            </div>
            <Toggle checked={inboxScope === 'unified'} onChange={(v) => setInboxScope(v ? 'unified' : 'active')} />
          </div>
        </Card>
      </div>

      {/* Danger zone */}
      <div className="space-y-2">
        <SectionHeader title={t('simulation')} />
        <Card className="overflow-hidden">
          <Row
            leading={<RotateCcw size={20} className="text-red-500" />}
            title={<span className="text-red-600">{L('Clear all data', 'مسح كل البيانات')}</span>}
            subtitle={L('Erase all accounts, organizations & communications', 'مسح كل الحسابات والمؤسسات والمراسلات')}
            onClick={() => setConfirmReset(true)}
          />
        </Card>
      </div>

      <Button variant="secondary" full onClick={logout} className="mt-2">
        <LogOut size={18} />
        {t('logout')}
      </Button>

      <div className="pt-2 text-center text-[11px] text-slate-400">IDGate · demo v1.0</div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)}>
        <div className="space-y-4">
          <div className="text-base font-semibold text-slate-800">
            {L('Clear all data?', 'مسح كل البيانات؟')}
          </div>
          <p className="text-sm text-slate-500">
            {L(
              'This permanently erases every account, organization, group and all communications (messages, notifications, posts) and signs you out. The app returns to onboarding so you start from scratch. This cannot be undone.',
              'سيؤدي هذا إلى مسح كل الحسابات والمؤسسات والمجموعات وكل المراسلات (الرسائل والتنبيهات والمنشورات) نهائيًا وتسجيل خروجك. يعود التطبيق إلى شاشة البدء لتبدأ من جديد. لا يمكن التراجع.',
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" full onClick={() => setConfirmReset(false)}>
              {t('cancel')}
            </Button>
            <Button
              variant="danger"
              full
              onClick={() => {
                setConfirmReset(false)
                reset()
              }}
            >
              {L('Clear everything', 'مسح الكل')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Contact Request — searchable, excludes already-connected */}
      <Sheet
        open={sheet === 'contact'}
        onClose={() => setSheet(null)}
        title={t('contactRequest')}
        footer={
          contactSent ? (
            <Button full variant="secondary" onClick={() => setSheet(null)}>
              {t('done')}
            </Button>
          ) : undefined
        }
      >
        {contactSent ? (
          <p className="py-6 text-center text-sm text-slate-600">
            {L('Contact request sent — it is now pending on your top bar until accepted.', 'تم إرسال طلب التواصل — وهو الآن معلّق في الشريط العلوي حتى القبول.')}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
              <Input
                value={contactQuery}
                onChange={(e) => setContactQuery(e.target.value)}
                placeholder={L('Search by name / internal code / mobile…', 'ابحث بالاسم / الكود الداخلي / الجوال…')}
                className="ps-9"
              />
            </div>
            {contactCandidates.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                {L('No accounts to connect with.', 'لا توجد حسابات للتواصل معها.')}
              </p>
            ) : (
              <div className="max-h-80 space-y-1.5 overflow-y-auto thin-scroll pe-0.5">
                {contactCandidates.map((o) => {
                  const info = resolve(o.ref)
                  return (
                    <div key={o.key} className="flex items-center gap-2 rounded-2xl border border-slate-100 p-2.5">
                      <div className="min-w-0 flex-1">
                        <ActorLine actor={o.ref} size={34} />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          sendContactRequest(o.ref)
                          setContactSent(true)
                        }}
                      >
                        <Send size={13} /> {t('send')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Sheet>

      <AccountSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  )
}
