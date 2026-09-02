import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang, useI18n } from '@/i18n'
import { ActorLine } from '@/components/identity'
import { Button, Card, Chip, Row, SectionHeader, Modal } from '@/ui/primitives'
import {
  User,
  Building2,
  Users,
  Info,
  ChevronRight,
  Languages,
  RotateCcw,
  LogOut,
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

  const me = currentNormal()
  const roles = normalId ? virtualsFor(normalId) : []

  const [confirmReset, setConfirmReset] = useState(false)

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
    </div>
  )
}
