import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Layers,
  Link2,
  Plus,
  Shield,
  Users,
  Briefcase,
  UsersRound,
} from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import {
  ORG_TYPE_LABELS,
  LEGAL_TYPE_LABELS,
  ORG_LEVEL_LABELS,
  INDUSTRY_LABELS,
  STRUCTURE_LABELS,
  PROFILE_GRANTABLE,
} from '@/data/reference'
import { STRUCTURE_ROOT_CODE } from '@/types'
import type {
  Industry,
  LegalEntity,
  LegalEntityType,
  OrgLevel,
  OrgType,
  PermissionSet,
  StructureKind,
  TransactionKey,
} from '@/types'
import { colorFor, unlinkedAddress, virtualAddress } from '@/lib/identity'
import { Badge, Button, Card, Field, Input, Select, SectionHeader } from '@/ui/primitives'

type Country = LegalEntity['countryOfRegistration']

const ORG_TYPES = Object.keys(ORG_TYPE_LABELS) as OrgType[]
const LEGAL_TYPES = Object.keys(LEGAL_TYPE_LABELS) as LegalEntityType[]
const ORG_LEVELS = Object.keys(ORG_LEVEL_LABELS) as OrgLevel[]
const INDUSTRIES = Object.keys(INDUSTRY_LABELS) as Industry[]
const STRUCTURE_KINDS = Object.keys(STRUCTURE_LABELS) as StructureKind[]
const COUNTRIES: Country[] = ['Egypt', 'USA', 'France', 'Germany', 'India']

const FULL: PermissionSet = { create: true, change: true, display: true, delete: true }
const DISPLAY_ONLY: PermissionSet = { create: false, change: false, display: true, delete: false }

const TOTAL_STEPS = 9

export function EntityWizard() {
  const navigate = useNavigate()
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const normalId = useStore((s) => s.normalId)
  const registerEntity = useStore((s) => s.registerEntity)
  const addStructureNode = useStore((s) => s.addStructureNode)
  const addProfile = useStore((s) => s.addProfile)
  const addDelegation = useStore((s) => s.addDelegation)
  const addPosition = useStore((s) => s.addPosition)
  const addVirtual = useStore((s) => s.addVirtual)
  const createLinkRequest = useStore((s) => s.createLinkRequest)
  const linkVirtual = useStore((s) => s.linkVirtual)
  const addGroup = useStore((s) => s.addGroup)
  const activateEntity = useStore((s) => s.activateEntity)

  // reactive lists
  const structures = useStore((s) => s.structures)
  const profiles = useStore((s) => s.profiles)
  const positions = useStore((s) => s.positions)
  const virtuals = useStore((s) => s.virtuals)
  const delegations = useStore((s) => s.delegations)
  const entities = useStore((s) => s.entities)
  const normals = useStore((s) => s.normals)

  const [step, setStep] = useState(1)
  const [entityId, setEntityId] = useState<string | null>(null)
  const [rootIds, setRootIds] = useState<Partial<Record<StructureKind, string>>>({})

  // step 1 / 2 draft form
  const [communicationCode] = useState(() => 'CA-' + Math.random().toString(36).slice(2, 8).toUpperCase())
  const [formalName, setFormalName] = useState('')
  const [commercialName, setCommercialName] = useState('')
  const [searchName, setSearchName] = useState('')
  const [domain, setDomain] = useState('')
  const [orgLevel, setOrgLevel] = useState<OrgLevel>('Individual')
  const [orgType, setOrgType] = useState<OrgType>('Com')
  const [legalType, setLegalType] = useState<LegalEntityType>('JSC')
  const [industry, setIndustry] = useState<Industry>('Manufacturing')
  const [country, setCountry] = useState<Country>('Egypt')

  const ent = entityId ? entities.find((e) => e.id === entityId) : undefined

  // derived scoped lists
  const myStructures = useMemo(
    () => (entityId ? structures.filter((n) => n.entityId === entityId && n.level > 0) : []),
    [structures, entityId],
  )
  const myProfiles = entityId ? profiles.filter((p) => p.entityId === entityId) : []
  const myPositions = entityId ? positions.filter((p) => p.entityId === entityId) : []
  const myVirtuals = entityId ? virtuals.filter((v) => v.entityId === entityId) : []
  const myDelegations = entityId ? delegations.filter((d) => d.entityId === entityId) : []

  // ── entity registration (once) ──────────────────────────────────────────────
  function ensureEntity(): string {
    if (entityId) return entityId
    const cName = commercialName.trim() || L('New Organization', 'مؤسسة جديدة')
    const id = registerEntity({
      communicationCode,
      entityCode: 'ENT-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      formalName: formalName.trim() || cName,
      commercialName: cName,
      searchName: searchName.trim() || cName,
      orgLevel,
      orgType,
      legalEntityType: legalType,
      mainIndustry: industry,
      countryOfRegistration: country,
      domain: (domain.trim() || cName.replace(/\s+/g, '')).slice(0, 20),
      status: 'draft',
      documents: {},
      adminNormalId: normalId ?? '',
      managingDirectorNormalId: normalId ?? undefined,
      logoColor: colorFor(cName),
    })
    setEntityId(id)
    return id
  }

  function ensureRoot(kind: StructureKind, id: string): string {
    const existing = rootIds[kind]
    if (existing) return existing
    const rid = addStructureNode({
      entityId: id,
      kind,
      code: STRUCTURE_ROOT_CODE[kind],
      name: kind,
      level: 0,
      parentId: null,
    })
    setRootIds((r) => ({ ...r, [kind]: rid }))
    return rid
  }

  function addLevel1(kind: StructureKind, name: string) {
    if (!entityId || !name.trim()) return
    const rid = ensureRoot(kind, entityId)
    addStructureNode({
      entityId,
      kind,
      code: STRUCTURE_ROOT_CODE[kind] + 1,
      name: name.trim(),
      level: 1,
      parentId: rid,
    })
  }

  function goNext() {
    if (step === 2) ensureEntity()
    setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  }
  function goBack() {
    if (step === 1) {
      navigate('/settings/entities')
      return
    }
    setStep((s) => Math.max(1, s - 1))
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      {/* progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800">{t('orgSetup')}</h2>
          <Badge tone="gate">
            {L('Step', 'خطوة')} {step}/{TOTAL_STEPS}
          </Badge>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gate-600 transition-all" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>

      {step === 1 && (
        <Step1 code={communicationCode} L={L} />
      )}

      {step === 2 && (
        <Card className="p-4 space-y-3">
          <SectionHeader title={L('Corporate Master Data', 'البيانات الأساسية للمؤسسة')} />
          <Field label={L('Formal name', 'الاسم الرسمي')} required>
            <Input value={formalName} onChange={(e) => setFormalName(e.target.value)} placeholder="Acme Holding S.A.E." />
          </Field>
          <Field label={L('Commercial name', 'الاسم التجاري')} required>
            <Input value={commercialName} onChange={(e) => setCommercialName(e.target.value)} placeholder="Acme" />
          </Field>
          <Field label={L('Search name', 'اسم البحث')}>
            <Input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="acme" />
          </Field>
          <Field label={L('Domain', 'النطاق')} hint={L('used in the address', 'يظهر في العنوان')}>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Acme" dir="ltr" className="font-mono" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L('Org. level', 'مستوى المؤسسة')}>
              <Select value={orgLevel} onChange={(e) => setOrgLevel(e.target.value as OrgLevel)}>
                {ORG_LEVELS.map((k) => (
                  <option key={k} value={k}>{bl(ORG_LEVEL_LABELS[k], lang)}</option>
                ))}
              </Select>
            </Field>
            <Field label={L('Org. type', 'نوع المؤسسة')}>
              <Select value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType)}>
                {ORG_TYPES.map((k) => (
                  <option key={k} value={k}>{bl(ORG_TYPE_LABELS[k], lang)}</option>
                ))}
              </Select>
            </Field>
            <Field label={L('Legal type', 'الكيان القانوني')}>
              <Select value={legalType} onChange={(e) => setLegalType(e.target.value as LegalEntityType)}>
                {LEGAL_TYPES.map((k) => (
                  <option key={k} value={k}>{bl(LEGAL_TYPE_LABELS[k], lang)}</option>
                ))}
              </Select>
            </Field>
            <Field label={L('Main industry', 'النشاط الرئيسي')}>
              <Select value={industry} onChange={(e) => setIndustry(e.target.value as Industry)}>
                {INDUSTRIES.map((k) => (
                  <option key={k} value={k}>{bl(INDUSTRY_LABELS[k], lang)}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={L('Country of registration', 'بلد التسجيل')}>
            <Select value={country} onChange={(e) => setCountry(e.target.value as Country)}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
          {ent && (
            <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              {L('Draft saved. Continue to build the structure.', 'تم حفظ المسودة. تابع لبناء الهيكل.')}
            </div>
          )}
        </Card>
      )}

      {step === 3 && (
        <Step3
          L={L}
          lang={lang}
          entityId={entityId}
          myStructures={myStructures}
          onAdd={addLevel1}
        />
      )}

      {step === 4 && (
        <Step4
          L={L}
          lang={lang}
          entityId={entityId}
          profiles={myProfiles}
          delegations={myDelegations}
          addProfile={addProfile}
          addDelegation={addDelegation}
        />
      )}

      {step === 5 && (
        <Step5
          L={L}
          entityId={entityId}
          positions={myPositions}
          addPosition={addPosition}
        />
      )}

      {step === 6 && (
        <Step6
          L={L}
          lang={lang}
          entity={ent}
          positions={myPositions}
          profiles={myProfiles}
          structures={myStructures}
          virtuals={myVirtuals}
          addVirtual={(payload) => addVirtual(payload)}
        />
      )}

      {step === 7 && (
        <Step7
          L={L}
          lang={lang}
          entityId={entityId}
          entity={ent}
          virtuals={myVirtuals}
          normals={normals}
          createLinkRequest={createLinkRequest}
          linkVirtual={linkVirtual}
        />
      )}

      {step === 8 && (
        <Step8
          L={L}
          lang={lang}
          entityId={entityId}
          virtuals={myVirtuals}
          positions={myPositions}
          addGroup={addGroup}
        />
      )}

      {step === 9 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-slate-800">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <h3 className="text-sm font-bold">{L('Review & activate', 'مراجعة وتفعيل')}</h3>
          </div>
          <Summary
            L={L}
            label={ent?.commercialName ?? '—'}
            counts={[
              { icon: <Layers size={14} />, n: myStructures.length, text: L('structure nodes', 'عقد الهيكل') },
              { icon: <Shield size={14} />, n: myProfiles.length, text: t('authorization') },
              { icon: <Briefcase size={14} />, n: myPositions.length, text: t('positions') },
              { icon: <Users size={14} />, n: myVirtuals.length, text: t('virtualAccountsMd') },
            ]}
          />
          <Button
            full
            disabled={!entityId}
            onClick={() => {
              if (!entityId) return
              activateEntity(entityId)
              navigate('/settings/entity/' + entityId)
            }}
          >
            <CheckCircle2 size={16} /> {t('activate')}
          </Button>
        </Card>
      )}

      {/* nav */}
      <div className="flex items-center gap-3">
        <Button variant="subtle" onClick={goBack} className="flex-1">
          <ArrowLeft size={16} className="rtl:rotate-180" /> {t('back')}
        </Button>
        {step < TOTAL_STEPS && (
          <Button onClick={goNext} className="flex-1" disabled={step === 2 && !commercialName.trim()}>
            {t('next')} <ArrowRight size={16} className="rtl:rotate-180" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
function Step1({ code, L }: { code: string; L: (en: string, ar: string) => string }) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Building2 size={20} className="text-gate-600" />
        <h3 className="text-sm font-bold">{L('Communication Area', 'منطقة التواصل')}</h3>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        {L(
          'Every organization is issued a root Communication Code. It anchors all its virtual identities, structures and messages inside IDGate.',
          'تحصل كل مؤسسة على كود تواصل جذري يربط جميع هوياتها الافتراضية وهياكلها ورسائلها داخل IDGate.',
        )}
      </p>
      <Field label={L('Communication code', 'كود التواصل')}>
        <Input value={code} readOnly dir="ltr" className="font-mono" />
      </Field>
    </Card>
  )
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function Step3({
  L,
  lang,
  entityId,
  myStructures,
  onAdd,
}: {
  L: (en: string, ar: string) => string
  lang: 'en' | 'ar'
  entityId: string | null
  myStructures: import('@/types').StructureNode[]
  onAdd: (kind: StructureKind, name: string) => void
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const SUGGESTIONS: Record<StructureKind, string[]> = {
    corporate: ['Head Office', 'Egypt Branch'],
    relation: ['Permanent', 'Annual'],
    organization: ['Operations', 'Finance'],
    geographical: ['Cairo', 'Alexandria'],
  }
  if (!entityId) return <NeedDraft L={L} />
  return (
    <div className="space-y-3">
      {STRUCTURE_KINDS.map((kind) => {
        const nodes = myStructures.filter((n) => n.kind === kind)
        return (
          <Card key={kind} className="p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-gate-600" />
              <h3 className="text-sm font-bold text-slate-800">{bl(STRUCTURE_LABELS[kind], lang)}</h3>
            </div>
            {nodes.length > 0 && (
              <div className="space-y-1">
                {nodes.map((n) => (
                  <div key={n.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                    <span className="font-mono text-[10px] text-gate-700" dir="ltr">{n.code}</span>
                    <span className="truncate">{n.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS[kind].map((s) => (
                <button
                  key={s}
                  onClick={() => onAdd(kind, s)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                >
                  + {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={drafts[kind] ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [kind]: e.target.value }))}
                placeholder={L('New node…', 'عقدة جديدة…')}
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  onAdd(kind, drafts[kind] ?? '')
                  setDrafts((d) => ({ ...d, [kind]: '' }))
                }}
              >
                <Plus size={14} />
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

// ── Step 4 ────────────────────────────────────────────────────────────────────
function Step4({
  L,
  lang,
  entityId,
  profiles,
  delegations,
  addProfile,
  addDelegation,
}: {
  L: (en: string, ar: string) => string
  lang: 'en' | 'ar'
  entityId: string | null
  profiles: import('@/types').Profile[]
  delegations: import('@/types').DelegationItem[]
  addProfile: (p: Omit<import('@/types').Profile, 'id'>) => string
  addDelegation: (d: Omit<import('@/types').DelegationItem, 'id'>) => void
}) {
  const [subject, setSubject] = useState('')
  const [limit, setLimit] = useState('')
  if (!entityId) return <NeedDraft L={L} />

  const makeExecutive = () => {
    const permissions: Partial<Record<TransactionKey, PermissionSet>> = {}
    PROFILE_GRANTABLE.forEach((k) => (permissions[k] = { ...FULL }))
    addProfile({ entityId, name: L('Executive (full)', 'تنفيذي (كامل)'), permissions })
  }
  const makeMember = () => {
    const keys: TransactionKey[] = ['post.send', 'post.react', 'post.comment', 'msg.send', 'msg.reply']
    const permissions: Partial<Record<TransactionKey, PermissionSet>> = {}
    keys.forEach((k) => (permissions[k] = { ...DISPLAY_ONLY, create: true }))
    addProfile({ entityId, name: L('Member (minimal)', 'عضو (أساسي)'), permissions })
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Shield size={18} className="text-gate-600" />
        <h3 className="text-sm font-bold">{L('Authorization Profiles', 'بروفايلات الصلاحيات')}</h3>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" className="flex-1" onClick={makeExecutive}>
          <Plus size={14} /> {L('Executive', 'تنفيذي')}
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={makeMember}>
          <Plus size={14} /> {L('Member', 'عضو')}
        </Button>
      </div>
      {profiles.length > 0 && (
        <div className="space-y-1.5">
          {profiles.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">{p.name}</span>
              <Badge tone="gate">
                {Object.keys(p.permissions).length} {L('tx', 'معاملة')}
              </Badge>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-slate-100 pt-3 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">{L('Delegation', 'التفويض')}</h4>
        <Field label={L('Subject', 'الموضوع')}>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={L('Approve purchase orders', 'اعتماد أوامر الشراء')} />
        </Field>
        <Field label={L('Limit', 'الحد')}>
          <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={L('Up to EGP 1,000,000', 'حتى ١٬٠٠٠٬٠٠٠ ج.م')} />
        </Field>
        <Button
          size="sm"
          variant="secondary"
          disabled={!subject.trim()}
          onClick={() => {
            addDelegation({ entityId, subject: subject.trim(), limit: limit.trim() })
            setSubject('')
            setLimit('')
          }}
        >
          <Plus size={14} /> {L('Add delegation', 'إضافة تفويض')}
        </Button>
        {delegations.length > 0 && (
          <div className="space-y-1 pt-1">
            {delegations.map((d) => (
              <div key={d.id} className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                <span className="font-medium text-slate-700">{d.subject}</span>
                {d.limit && <span className="text-slate-400"> · {d.limit}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Step 5 ────────────────────────────────────────────────────────────────────
function Step5({
  L,
  entityId,
  positions,
  addPosition,
}: {
  L: (en: string, ar: string) => string
  entityId: string | null
  positions: import('@/types').Position[]
  addPosition: (entityId: string, name: string) => string
}) {
  const [name, setName] = useState('')
  if (!entityId) return <NeedDraft L={L} />
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Briefcase size={18} className="text-gate-600" />
        <h3 className="text-sm font-bold">{L('Positions', 'الوظائف')}</h3>
      </div>
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('e.g. CEO', 'مثال: مدير عام')} />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (!name.trim()) return
            addPosition(entityId, name.trim())
            setName('')
          }}
        >
          <Plus size={14} />
        </Button>
      </div>
      {positions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {positions.map((p) => (
            <Badge key={p.id} tone="slate">{p.name}</Badge>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Step 6 ────────────────────────────────────────────────────────────────────
function Step6({
  L,
  lang,
  entity,
  positions,
  profiles,
  structures,
  virtuals,
  addVirtual,
}: {
  L: (en: string, ar: string) => string
  lang: 'en' | 'ar'
  entity: LegalEntity | undefined
  positions: import('@/types').Position[]
  profiles: import('@/types').Profile[]
  structures: import('@/types').StructureNode[]
  virtuals: import('@/types').VirtualCharacter[]
  addVirtual: (v: Omit<import('@/types').VirtualCharacter, 'id' | 'createdAt' | 'status'>) => string
}) {
  const [posId, setPosId] = useState('')
  const [profId, setProfId] = useState('')
  const [nodes, setNodes] = useState<Partial<Record<StructureKind, string>>>({})
  if (!entity) return <NeedDraft L={L} />

  const create = () => {
    const pos = positions.find((p) => p.id === posId)
    if (!pos) return
    addVirtual({
      entityId: entity.id,
      positionId: pos.id,
      positionName: pos.name,
      structure: {
        corporate: nodes.corporate,
        relation: nodes.relation,
        organization: nodes.organization,
        geographical: nodes.geographical,
      },
      profileIds: profId ? [profId] : [],
      delegationSubjects: [],
      delegationLimits: [],
      delegationDisplay: true,
      delegateOthers: false,
      duration: { open: true },
      displayHistory: true,
      location: 'contacts',
      linkedNormalId: null,
    })
  }

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Users size={18} className="text-gate-600" />
        <h3 className="text-sm font-bold">{L('Virtual Accounts', 'الحسابات الافتراضية')}</h3>
      </div>
      {positions.length === 0 ? (
        <p className="text-xs text-slate-500">{L('Add positions in the previous step first.', 'أضف وظائف في الخطوة السابقة أولًا.')}</p>
      ) : (
        <>
          <Field label={L('Position', 'الوظيفة')} required>
            <Select value={posId} onChange={(e) => setPosId(e.target.value)}>
              <option value="">—</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={L('Profile', 'البروفايل')}>
            <Select value={profId} onChange={(e) => setProfId(e.target.value)}>
              <option value="">—</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
          {STRUCTURE_KINDS.map((kind) => {
            const opts = structures.filter((n) => n.kind === kind)
            if (opts.length === 0) return null
            return (
              <Field key={kind} label={bl(STRUCTURE_LABELS[kind], lang)}>
                <Select value={nodes[kind] ?? ''} onChange={(e) => setNodes((n) => ({ ...n, [kind]: e.target.value || undefined }))}>
                  <option value="">—</option>
                  {opts.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </Select>
              </Field>
            )
          })}
          <Button full variant="secondary" disabled={!posId} onClick={create}>
            <Plus size={14} /> {L('Create virtual account', 'إنشاء حساب افتراضي')}
          </Button>
        </>
      )}

      {virtuals.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          {virtuals.map((v) => (
            <div key={v.id} className="rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-xs font-semibold text-slate-700">{v.positionName}</div>
              <div className="font-mono text-[10px] text-gate-700" dir="ltr">{unlinkedAddress(v, entity)}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Step 7 ────────────────────────────────────────────────────────────────────
function Step7({
  L,
  lang,
  entityId,
  entity,
  virtuals,
  normals,
  createLinkRequest,
  linkVirtual,
}: {
  L: (en: string, ar: string) => string
  lang: 'en' | 'ar'
  entityId: string | null
  entity: LegalEntity | undefined
  virtuals: import('@/types').VirtualCharacter[]
  normals: import('@/types').NormalCharacter[]
  createLinkRequest: (entityId: string, virtualId: string, targetNormalId: string) => void
  linkVirtual: (virtualId: string, normalId: string) => void
}) {
  const [vId, setVId] = useState('')
  const [nId, setNId] = useState('')
  const [msg, setMsg] = useState('')
  if (!entityId || !entity) return <NeedDraft L={L} />

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Link2 size={18} className="text-gate-600" />
        <h3 className="text-sm font-bold">{L('Link a Position to a Person', 'ربط الوظيفة بشخص')}</h3>
      </div>
      <p className="text-xs text-slate-500">
        {L(
          'A position stays dormant until a natural person accepts the link and becomes its host.',
          'تبقى الوظيفة خاملة حتى يقبل شخص طبيعي الربط ويصبح مضيفها.',
        )}
      </p>
      <Field label={L('Virtual account', 'الحساب الافتراضي')} required>
        <Select value={vId} onChange={(e) => setVId(e.target.value)}>
          <option value="">—</option>
          {virtuals.map((v) => (
            <option key={v.id} value={v.id}>{v.positionName}</option>
          ))}
        </Select>
      </Field>
      <Field label={L('Person', 'الشخص')} required>
        <Select value={nId} onChange={(e) => setNId(e.target.value)}>
          <option value="">—</option>
          {normals.map((n) => (
            <option key={n.id} value={n.id}>{n.fullName}</option>
          ))}
        </Select>
      </Field>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          className="flex-1"
          disabled={!vId || !nId}
          onClick={() => {
            createLinkRequest(entityId, vId, nId)
            setMsg(L('Link request sent — awaiting acceptance.', 'تم إرسال طلب الربط — بانتظار القبول.'))
          }}
        >
          {L('Send link request', 'إرسال طلب ربط')}
        </Button>
        <Button
          size="sm"
          className="flex-1"
          disabled={!vId || !nId}
          onClick={() => {
            linkVirtual(vId, nId)
            const v = virtuals.find((x) => x.id === vId)
            const host = normals.find((x) => x.id === nId)
            setMsg(v ? virtualAddress({ ...v, linkedNormalId: nId }, entity, host) : '')
          }}
        >
          {L('Link now (demo)', 'ربط فوري (تجربة)')}
        </Button>
      </div>
      {msg && (
        <div className="rounded-2xl bg-emerald-50 px-3 py-2 font-mono text-[11px] text-emerald-700" dir="ltr">
          {msg}
        </div>
      )}
    </Card>
  )
}

// ── Step 8 ────────────────────────────────────────────────────────────────────
function Step8({
  L,
  lang,
  entityId,
  virtuals,
  positions,
  addGroup,
}: {
  L: (en: string, ar: string) => string
  lang: 'en' | 'ar'
  entityId: string | null
  virtuals: import('@/types').VirtualCharacter[]
  positions: import('@/types').Position[]
  addGroup: (g: Omit<import('@/types').Group, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [posName, setPosName] = useState('')
  const [done, setDone] = useState(false)
  if (!entityId) return <NeedDraft L={L} />
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <UsersRound size={18} className="text-gate-600" />
        <h3 className="text-sm font-bold">{L('Communication Group', 'مجموعة تواصل')}</h3>
      </div>
      <Field label={L('Group name', 'اسم المجموعة')} required>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('All CEOs', 'كل المدراء')} />
      </Field>
      <Field label={L('Position criteria', 'معيار الوظيفة')}>
        <Select value={posName} onChange={(e) => setPosName(e.target.value)}>
          <option value="">{L('Any', 'الكل')}</option>
          {positions.map((p) => (
            <option key={p.id} value={p.name}>{p.name}</option>
          ))}
        </Select>
      </Field>
      <Button
        full
        variant="secondary"
        disabled={!name.trim()}
        onClick={() => {
          addGroup({
            entityId,
            ownerVirtualId: virtuals[0]?.id ?? '',
            name: name.trim(),
            positionName: posName || undefined,
          })
          setName('')
          setPosName('')
          setDone(true)
        }}
      >
        <Plus size={14} /> {L('Create group', 'إنشاء مجموعة')}
      </Button>
      {done && (
        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {L('Group created.', 'تم إنشاء المجموعة.')}
        </div>
      )}
    </Card>
  )
}

function Summary({
  L,
  label,
  counts,
}: {
  L: (en: string, ar: string) => string
  label: string
  counts: { icon: React.ReactNode; n: number; text: string }[]
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-bold text-slate-800">{label}</div>
      <div className="grid grid-cols-2 gap-2">
        {counts.map((c, i) => (
          <div key={i} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <span className="text-gate-600">{c.icon}</span>
            <span className="font-bold text-slate-800">{c.n}</span>
            <span className="truncate">{c.text}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400">
        {L('Activating verifies the organization and grants the managing director full authority.', 'التفعيل يوثّق المؤسسة ويمنح المدير المسؤول صلاحية كاملة.')}
      </p>
    </div>
  )
}

function NeedDraft({ L }: { L: (en: string, ar: string) => string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-slate-500">
        {L('Complete the master-data step and continue to save a draft first.', 'أكمل خطوة البيانات الأساسية وتابع لحفظ مسودة أولًا.')}
      </p>
    </Card>
  )
}
