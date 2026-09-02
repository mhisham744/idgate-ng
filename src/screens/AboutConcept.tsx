import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang, bl } from '@/i18n'
import { Card } from '@/ui/primitives'
import { STRUCTURE_LABELS } from '@/data/reference'
import { STRUCTURE_ROOT_CODE } from '@/types'
import type { StructureKind } from '@/types'
import {
  ChevronLeft,
  Users,
  Building2,
  UserSquare,
  AtSign,
  Network,
  ListOrdered,
  ShieldCheck,
  Send,
} from 'lucide-react'

/** Rich bilingual explainer of the IDGate concept. */
export function AboutConcept() {
  const nav = useNavigate()
  const { lang, t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const structureKinds: StructureKind[] = ['corporate', 'relation', 'organization', 'geographical']

  const steps: { en: string; ar: string }[] = [
    { en: 'Communication Area & Code', ar: 'منطقة ورمز التواصل' },
    { en: 'Corporate Account', ar: 'الحساب المؤسسي' },
    { en: 'Communication Structure', ar: 'هيكل التواصل' },
    { en: 'Authorization Profiles & Delegations', ar: 'ملفات الصلاحيات والتفويضات' },
    { en: 'Positions', ar: 'المناصب' },
    { en: 'Virtual accounts', ar: 'الحسابات الافتراضية' },
    { en: 'Link entity ↔ person', ar: 'ربط الكيان ↔ الشخص' },
    { en: 'Groups', ar: 'المجموعات' },
    { en: 'Interaction & communication', ar: 'التفاعل والتواصل' },
  ]

  return (
    <div className="p-4 space-y-4 pb-8">
      <button
        onClick={() => nav('/settings')}
        className="flex items-center gap-1 text-sm font-medium text-slate-500"
      >
        <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''} />
        {t('settings')}
      </button>

      {/* Intro */}
      <Card className="bg-gate-600 p-5 text-white">
        <div className="text-lg font-bold">{t('appName')}</div>
        <div className="mt-1 text-sm text-white/90">{t('subtitle')}</div>
      </Card>

      {/* 1. Three dimensions */}
      <Section icon={<Users size={18} />} title={L('The three dimensions', 'الأبعاد الثلاثة')}>
        <p className="mb-3">
          {L(
            'Every identity in IDGate belongs to one of three dimensions of personality.',
            'كل هوية في IDGate تنتمي إلى أحد أبعاد الشخصية الثلاثة.',
          )}
        </p>
        <Dimension
          icon={<UserSquare size={16} />}
          title={L('Normal character', 'الشخصية الطبيعية')}
          body={L(
            'A natural person. A permanent, free personal account.',
            'شخص طبيعي. حساب شخصي دائم ومجاني.',
          )}
        />
        <Dimension
          icon={<Building2 size={16} />}
          title={L('Legal entity', 'الكيان القانوني')}
          body={L(
            'A corporate or institutional account: company, ministry, university, club, bank…',
            'حساب مؤسسي: شركة، وزارة، جامعة، نادٍ، بنك…',
          )}
        />
        <Dimension
          icon={<Network size={16} />}
          title={L('Virtual character', 'الشخصية الافتراضية')}
          body={L(
            'A “Position” acquired by a person from a legal entity. Dormant until linked to a host person, then active — and it can be blocked.',
            '«منصب» يحصل عليه الشخص من كيان قانوني. خامل حتى يُربط بشخص مضيف فيصبح نشطًا — ويمكن حظره.',
          )}
        />
        <p className="mt-3 text-slate-500">
          {L(
            'A person acts through one active account at a time — their personal account or any active virtual they host.',
            'يعمل الشخص من خلال حساب نشط واحد في كل مرة — حسابه الشخصي أو أي شخصية افتراضية نشطة يستضيفها.',
          )}
        </p>
      </Section>

      {/* 2. Address format */}
      <Section icon={<AtSign size={18} />} title={L('The address format', 'صيغة العنوان')}>
        <AddrRow
          label={L('Personal', 'شخصي')}
          value="First.Last"
        />
        <AddrRow
          label={L('Unlinked position', 'منصب غير مربوط')}
          value="Position.Domain.OrgType.LegalType"
        />
        <AddrRow
          label={L('Linked virtual', 'افتراضي مربوط')}
          value="First.Last,Position@Domain.OrgType.LegalType"
        />
        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
          <div className="mb-1 text-xs text-slate-500">{L('Example', 'مثال')}</div>
          <div className="font-mono text-sm text-gate-700" dir="ltr">
            Hossam.Fouad,CEO@Nestle.Com.JSC
          </div>
        </div>
      </Section>

      {/* 3. Communication structures */}
      <Section icon={<Network size={18} />} title={L('The four communication structures', 'هياكل التواصل الأربعة')}>
        <p className="mb-3">
          {L(
            'Every legal entity builds four parallel structures. Each has a root code.',
            'يبني كل كيان قانوني أربعة هياكل متوازية، لكلٍّ منها رمز جذري.',
          )}
        </p>
        <div className="space-y-2">
          {structureKinds.map((k) => (
            <div key={k} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">{bl(STRUCTURE_LABELS[k], lang)}</span>
              <span className="font-mono text-sm text-gate-700" dir="ltr">
                {STRUCTURE_ROOT_CODE[k]}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* 4. Org setup steps */}
      <Section icon={<ListOrdered size={18} />} title={L('The 9-step organization setup', 'إعداد المنظمة في 9 خطوات')}>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gate-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-slate-700">{L(s.en, s.ar)}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* 5. Permissions */}
      <Section icon={<ShieldCheck size={18} />} title={L('Permissions model', 'نموذج الصلاحيات')}>
        <ul className="space-y-2 text-slate-700">
          <Bullet>
            {L(
              'A personal account is ungoverned for personal-createable transactions.',
              'الحساب الشخصي غير محكوم بالنسبة للمعاملات التي يمكن للشخص إنشاؤها.',
            )}
          </Bullet>
          <Bullet>
            {L(
              'A virtual account is governed by its merged authorization profiles.',
              'الحساب الافتراضي محكوم بملفات الصلاحيات المدمجة الخاصة به.',
            )}
          </Bullet>
          <Bullet>
            {L(
              'Personal accounts can receive notification and tool artefacts, but generally cannot create them.',
              'يمكن للحسابات الشخصية استقبال التنبيهات وعناصر الأدوات، لكنها غالبًا لا تستطيع إنشاءها.',
            )}
          </Bullet>
        </ul>
      </Section>

      {/* 6. Communication rule */}
      <Section icon={<Send size={18} />} title={L('Communication rule', 'قاعدة التواصل')}>
        <p>
          {L(
            'Communication happens at the individual-account or group level only — never “through the structure”.',
            'يحدث التواصل على مستوى الحساب الفردي أو المجموعة فقط — وليس «عبر الهيكل».',
          )}
        </p>
        <p className="mt-2 text-slate-500">
          {L(
            'A group message reaches that node level and all lower levels beneath it.',
            'تصل رسالة المجموعة إلى مستوى تلك العقدة وجميع المستويات الأدنى منها.',
          )}
        </p>
      </Section>

      <div className="pt-2 text-center text-[11px] text-slate-400">{t('appName')} · {t('tagline')}</div>
    </div>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-base font-bold text-slate-800">
        <span className="text-gate-600">{icon}</span>
        {title}
      </div>
      <div className="text-sm leading-relaxed text-slate-700">{children}</div>
    </Card>
  )
}

function Dimension({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="mb-2 flex items-start gap-3 rounded-2xl bg-slate-50 p-3">
      <span className="mt-0.5 text-gate-600">{icon}</span>
      <div>
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{body}</div>
      </div>
    </div>
  )
}

function AddrRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="min-w-0 truncate font-mono text-xs text-gate-700" dir="ltr">
        {value}
      </span>
    </div>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gate-600" />
      <span className="text-sm">{children}</span>
    </li>
  )
}
