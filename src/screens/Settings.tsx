import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang, useI18n } from '@/i18n'
import { ActorLine, useResolveActor } from '@/components/identity'
import { actorKey } from '@/lib/identity'
import { Button, Card, Chip, Field, Row, Select, SectionHeader, Sheet, Modal } from '@/ui/primitives'
import type { ActorRef } from '@/types'
import {
  User,
  Building2,
  Users,
  UsersRound,
  UserPlus,
  ShieldCheck,
  Link2,
  Info,
  ChevronRight,
  Languages,
  RotateCcw,
  LogOut,
  Send,
} from 'lucide-react'

/** Settings menu — identity summary, navigation, language, danger zone, sign out. */
export function Settings() {
  const nav = useNavigate()
  const { lang, isRtl, t } = useLang()
  const setLang = useI18n((s) => s.setLang)

  const normalId = useStore((s) => s.normalId)
  const currentNormal = useStore((s) => s.currentNormal)
  const virtualsFor = useStore((s) => s.virtualsFor)
  const logout = useStore((s) => s.logout)
  const reset = useStore((s) => s.reset)
  const active = useStore((s) => s.active)
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const sendContactRequest = useStore((s) => s.sendContactRequest)
  const resolve = useResolveActor()

  const me = currentNormal()
  const roles = normalId ? virtualsFor(normalId) : []

  const [confirmReset, setConfirmReset] = useState(false)
  // Tools relocated from the Tools page: 'contact' is functional; the other two are illustrative.
  const [sheet, setSheet] = useState<null | 'contact' | 'delegation' | 'link'>(null)
  const [recipient, setRecipient] = useState('')
  const [contactSent, setContactSent] = useState(false)

  const meKey = active ? actorKey(active) : ''
  const contactOptions = useMemo<{ key: string; ref: ActorRef }[]>(() => {
    const opts: { key: string; ref: ActorRef }[] = [
      ...normals.map((n) => ({ key: `n:${n.id}`, ref: { kind: 'normal', normalId: n.id } as ActorRef })),
      ...virtuals
        .filter((v) => v.status === 'active')
        .map((v) => ({ key: `v:${v.id}`, ref: { kind: 'virtual', virtualId: v.id } as ActorRef })),
    ]
    return opts.filter((o) => o.key !== meKey)
  }, [normals, virtuals, meKey])

  const openSheet = (which: 'contact' | 'delegation' | 'link') => {
    setRecipient('')
    setContactSent(false)
    setSheet(which)
  }

  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const Chevron = <ChevronRight size={18} className={isRtl ? 'rotate-180 text-slate-400' : 'text-slate-400'} />

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* Identity header */}
      <Card className="p-4">
        {normalId && <ActorLine actor={{ kind: 'normal', normalId }} size={52} />}
        <div className="mt-3 text-xs text-slate-500">
          {L(
            `${roles.length} hosted ${roles.length === 1 ? 'role' : 'roles'}`,
            `${roles.length} ${roles.length === 1 ? 'صفة مستضافة' : 'صفة مستضافة'}`,
          )}
          {me ? ` · ${me.city}, ${me.residenceCountry}` : ''}
        </div>
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
          leading={<Building2 size={20} className="text-gate-600" />}
          title={t('myEntities')}
          subtitle={L('Legal entities you administer', 'الكيانات القانونية التي تديرها')}
          trailing={Chevron}
          onClick={() => nav('/settings/entities')}
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
          subtitle={L('Communicate with a node & below', 'التواصل مع مستوى وما دونه')}
          trailing={Chevron}
          onClick={() => nav('/settings/groups')}
        />
        <Row
          leading={<UserPlus size={20} className="text-gate-600" />}
          title={t('contactRequest')}
          subtitle={L('Ask to connect with a person or entity', 'اطلب التواصل مع شخص أو جهة')}
          trailing={Chevron}
          onClick={() => openSheet('contact')}
        />
        <Row
          leading={<ShieldCheck size={20} className="text-gate-600" />}
          title={t('delegationDisplay')}
          subtitle={L('Request to view delegated authorities', 'طلب عرض الصلاحيات المفوضة')}
          trailing={Chevron}
          onClick={() => openSheet('delegation')}
        />
        <Row
          leading={<Link2 size={20} className="text-gate-600" />}
          title={t('linkRequest')}
          subtitle={L('Request to link a position to a person', 'طلب ربط منصب بشخص')}
          trailing={Chevron}
          onClick={() => openSheet('link')}
        />
        <Row
          leading={<Info size={20} className="text-gate-600" />}
          title={t('aboutConcept')}
          subtitle={L('How IDGate works', 'كيف تعمل IDGate')}
          trailing={Chevron}
          onClick={() => nav('/settings/about')}
        />
      </Card>

      {/* Language */}
      <div className="space-y-2">
        <SectionHeader title={t('language')} />
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Languages size={18} className="text-slate-400" />
            <div className="flex gap-2">
              <Chip active={lang === 'en'} onClick={() => setLang('en')}>
                English
              </Chip>
              <Chip active={lang === 'ar'} onClick={() => setLang('ar')}>
                العربية
              </Chip>
            </div>
          </div>
        </Card>
      </div>

      {/* Danger zone */}
      <div className="space-y-2">
        <SectionHeader title={t('simulation')} />
        <Card className="overflow-hidden">
          <Row
            leading={<RotateCcw size={20} className="text-red-500" />}
            title={<span className="text-red-600">{L('Reset demo data', 'إعادة تعيين بيانات العرض')}</span>}
            subtitle={L('Restore all seed data and sign out', 'استعادة كل البيانات وتسجيل الخروج')}
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
            {L('Reset demo data?', 'إعادة تعيين البيانات؟')}
          </div>
          <p className="text-sm text-slate-500">
            {L(
              'This restores the original seed data and signs you out. You will need to onboard again.',
              'سيؤدي هذا إلى استعادة البيانات الأصلية وتسجيل خروجك. ستحتاج إلى الدخول من جديد.',
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
              {L('Reset', 'إعادة تعيين')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Contact Request — functional */}
      <Sheet
        open={sheet === 'contact'}
        onClose={() => setSheet(null)}
        title={t('contactRequest')}
        footer={
          contactSent ? (
            <Button full variant="secondary" onClick={() => setSheet(null)}>
              {t('done')}
            </Button>
          ) : (
            <Button
              full
              disabled={!recipient}
              onClick={() => {
                const ref = contactOptions.find((o) => o.key === recipient)?.ref
                if (!ref) return
                sendContactRequest(ref)
                setContactSent(true)
              }}
            >
              <Send size={16} className="me-1.5" />
              {t('send')}
            </Button>
          )
        }
      >
        {contactSent ? (
          <p className="py-6 text-center text-sm text-slate-600">
            {L('Contact request sent.', 'تم إرسال طلب التواصل.')}
          </p>
        ) : (
          <Field label={t('to')} required>
            <Select value={recipient} onChange={(e) => setRecipient(e.target.value)}>
              <option value="">{L('Select a recipient', 'اختر مستلمًا')}</option>
              {contactOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {resolve(o.ref).displayName}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Sheet>

      {/* Delegation Display Request / Link Request — illustrative */}
      <Sheet
        open={sheet === 'delegation' || sheet === 'link'}
        onClose={() => setSheet(null)}
        title={sheet === 'link' ? t('linkRequest') : t('delegationDisplay')}
        footer={
          <Button full variant="secondary" onClick={() => setSheet(null)}>
            {t('close')}
          </Button>
        }
      >
        <p className="text-sm text-slate-600">
          {L(
            'This tool is part of the IDGate demo and is illustrative only.',
            'هذه الأداة جزء من العرض التوضيحي لـ IDGate وهي للتوضيح فقط.',
          )}
        </p>
      </Sheet>
    </div>
  )
}
