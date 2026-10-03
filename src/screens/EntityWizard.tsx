import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  Layers,
  Link2,
  Pencil,
  Plus,
  Shield,
  Trash2,
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
import { StructureEditor } from '@/components/StructureEditor'
import { ProfileEditor } from '@/components/ProfileEditor'
import { VirtualEntityForm, VirtualEntityDetail } from '@/components/VirtualEntityForm'
import { Badge, Button, Card, Field, Input, Select, SectionHeader, Sheet } from '@/ui/primitives'

type Country = LegalEntity['countryOfRegistration']

const ORG_TYPES = Object.keys(ORG_TYPE_LABELS) as OrgType[]
const LEGAL_TYPES = Object.keys(LEGAL_TYPE_LABELS) as LegalEntityType[]
const ORG_LEVELS = Object.keys(ORG_LEVEL_LABELS) as OrgLevel[]
const INDUSTRIES = Object.keys(INDUSTRY_LABELS) as Industry[]
const STRUCTURE_KINDS = Object.keys(STRUCTURE_LABELS) as StructureKind[]
const COUNTRIES: Country[] = ['Egypt', 'USA', 'France', 'Germany', 'India']

const FULL: PermissionSet = { create: true, change: true, display: true, delete: true }
const DISPLAY_ONLY: PermissionSet = { create: false, change: false, display: true, delete: false }

const TOTAL_STEPS = 8

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
  const updatePosition = useStore((s) => s.updatePosition)
  const removePosition = useStore((s) => s.removePosition)
  const addVirtual = useStore((s) => s.addVirtual)
  const removeVirtual = useStore((s) => s.removeVirtual)
  const activateEntity = useStore((s) => s.activateEntity)
  const updateEntity = useStore((s) => s.updateEntity)
  const sendSystemMessage = useStore((s) => s.sendSystemMessage)
  const communicationAreas = useStore((s) => s.communicationAreas)
  const addCommunicationArea = useStore((s) => s.addCommunicationArea)

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

  // step 1 / 2 draft form
  const [communicationCode] = useState(() => 'CA-' + Math.random().toString(36).slice(2, 8).toUpperCase())
  const [entityCode] = useState(() => 'ENT-' + Math.random().toString(36).slice(2, 8).toUpperCase())
  const [areaId, setAreaId] = useState('')
  const [formalName, setFormalName] = useState('')
  const [commercialName, setCommercialName] = useState('')
  const [searchName, setSearchName] = useState('')
  const [domain, setDomain] = useState('')
  const [orgLevel, setOrgLevel] = useState<OrgLevel | ''>('')
  const [orgType, setOrgType] = useState<OrgType | ''>('')
  const [legalType, setLegalType] = useState<LegalEntityType | ''>('')
  const [industry, setIndustry] = useState<Industry | ''>('')
  const [country, setCountry] = useState<Country | ''>('')
  const [adminNId, setAdminNId] = useState('')

  const ent = entityId ? entities.find((e) => e.id === entityId) : undefined

  // derived scoped lists
  const allMyStructures = useMemo(
    () => (entityId ? structures.filter((n) => n.entityId === entityId) : []),
    [structures, entityId],
  )
  const myStructures = allMyStructures.filter((n) => n.level > 0)
  const myProfiles = entityId ? profiles.filter((p) => p.entityId === entityId) : []
  const myPositions = entityId ? positions.filter((p) => p.entityId === entityId) : []
  const myVirtuals = entityId ? virtuals.filter((v) => v.entityId === entityId) : []
  const myDelegations = entityId ? delegations.filter((d) => d.entityId === entityId) : []

  // Communication areas the creator may pick: ones they created, or areas of orgs
  // their virtual accounts already belong to.
  const visibleAreas = useMemo(() => {
    const myEntityIds = new Set(virtuals.filter((v) => v.linkedNormalId === normalId).map((v) => v.entityId))
    const myAreaIds = new Set(
      entities.filter((e) => myEntityIds.has(e.id)).map((e) => e.communicationAreaId).filter(Boolean) as string[],
    )
    return communicationAreas.filter((a) => a.createdByNormalId === normalId || myAreaIds.has(a.id))
  }, [communicationAreas, entities, virtuals, normalId])

  // ── entity registration (once) ──────────────────────────────────────────────
  function ensureEntity(): string {
    if (entityId) return entityId
    const cName = commercialName.trim() || L('New Organization', 'مؤسسة جديدة')
    const id = registerEntity({
      communicationCode,
      communicationAreaId: areaId || undefined,
      entityCode,
      formalName: formalName.trim() || cName,
      commercialName: cName,
      searchName: searchName.trim() || cName,
      orgLevel: (orgLevel || 'Individual') as OrgLevel,
      orgType: (orgType || 'Com') as OrgType,
      legalEntityType: (legalType || 'JSC') as LegalEntityType,
      mainIndustry: (industry || 'Manufacturing') as Industry,
      countryOfRegistration: (country || 'Egypt') as Country,
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

  const step2Valid =
    !!commercialName.trim() &&
    !!searchName.trim() &&
    !!areaId &&
    !!orgLevel &&
    !!orgType &&
    !!legalType &&
    !!industry &&
    !!country

  function goNext() {
    if (step === 1) ensureEntity()
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
        <Card className="p-4 space-y-3">
          <SectionHeader title={L('Corporate Master Data', 'البيانات الأساسية للمؤسسة')} />
          <Field label={L('Communication Area', 'منطقة التواصل')} required>
            <Select value={areaId} onChange={(e) => setAreaId(e.target.value)}>
              <option value="">{L('Select area…', 'اختر المنطقة…')}</option>
              {visibleAreas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </Select>
          </Field>
          <Field label={L('Entity code', 'كود المؤسسة')} hint={L('auto-generated', 'يُنشأ تلقائيًا')}>
            <Input value={entityCode} readOnly dir="ltr" className="font-address" />
          </Field>
          <Field label={L('Formal name', 'الاسم الرسمي')} required>
            <Input value={formalName} onChange={(e) => setFormalName(e.target.value)} placeholder="Acme Holding S.A.E." />
          </Field>
          <Field label={L('Commercial name', 'الاسم التجاري')} required>
            <Input value={commercialName} onChange={(e) => setCommercialName(e.target.value)} placeholder="Acme" />
          </Field>
          <Field label={L('Search name', 'اسم البحث')} required>
            <Input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="acme" />
          </Field>
          <Field label={L('Domain', 'النطاق')} hint={L('used in the address', 'يظهر في العنوان')}>
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="Acme" dir="ltr" className="font-mono" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L('Org. level', 'مستوى المؤسسة')} required>
              <Select value={orgLevel} onChange={(e) => setOrgLevel(e.target.value as OrgLevel)}>
                <option value="">—</option>
                {ORG_LEVELS.map((k) => (
                  <option key={k} value={k}>{bl(ORG_LEVEL_LABELS[k], lang)}</option>
                ))}
              </Select>
            </Field>
            <Field label={L('Org. type', 'نوع المؤسسة')} required>
              <Select value={orgType} onChange={(e) => setOrgType(e.target.value as OrgType)}>
                <option value="">—</option>
                {ORG_TYPES.map((k) => (
                  <option key={k} value={k}>{bl(ORG_TYPE_LABELS[k], lang)}</option>
                ))}
              </Select>
            </Field>
            <Field label={L('Legal type', 'الكيان القانوني')} required>
              <Select value={legalType} onChange={(e) => setLegalType(e.target.value as LegalEntityType)}>
                <option value="">—</option>
                {LEGAL_TYPES.map((k) => (
                  <option key={k} value={k}>{bl(LEGAL_TYPE_LABELS[k], lang)}</option>
                ))}
              </Select>
            </Field>
            <Field label={L('Main industry', 'النشاط الرئيسي')} required>
              <Select value={industry} onChange={(e) => setIndustry(e.target.value as Industry)}>
                <option value="">—</option>
                {INDUSTRIES.map((k) => (
                  <option key={k} value={k}>{bl(INDUSTRY_LABELS[k], lang)}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={L('Country of registration', 'بلد التسجيل')} required>
            <Select value={country} onChange={(e) => setCountry(e.target.value as Country)}>
              <option value="">—</option>
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

      {step === 2 && <Step3 L={L} lang={lang} entityId={entityId} myStructures={allMyStructures} />}

      {step === 3 && <ProfilesStep L={L} entityId={entityId} profiles={myProfiles} />}

      {step === 4 && (
        <DelegationStep L={L} entityId={entityId} delegations={myDelegations} addDelegation={addDelegation} />
      )}

      {step === 5 && (
        <Step5 L={L} entityId={entityId} positions={myPositions} addPosition={addPosition} updatePosition={updatePosition} removePosition={removePosition} />
      )}

      {step === 6 && (
        <Step6
          L={L}
          entity={ent}
          virtuals={myVirtuals}
          removeVirtual={removeVirtual}
        />
      )}

      {step === 7 && (
        <AdminStep L={L} normals={normals} adminNId={adminNId} setAdminNId={setAdminNId} />
      )}

      {step === 8 && (
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
              { icon: <Users size={14} />, n: myVirtuals.length, text: L('Virtual Entity', 'الكيان الافتراضي') },
            ]}
          />
          <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {L('On activation, an Administrator virtual entity is created for ', 'عند التفعيل، يُنشأ كيان افتراضي "مدير" لـ ')}
            <span className="font-semibold text-slate-800">{normals.find((n) => n.id === adminNId)?.fullName ?? '—'}</span>
            {L(' with full authority, and control is handed over to them.', ' بصلاحية كاملة، وتُسلَّم الإدارة إليه.')}
          </div>
          <Button
            full
            disabled={!entityId || !adminNId}
            onClick={() => {
              if (!entityId || !adminNId) return
              // Auto-create the Administrator position + full-authority virtual, link the chosen person.
              const posId = addPosition(entityId, 'Administrator')
              const permissions: Partial<Record<TransactionKey, PermissionSet>> = {}
              PROFILE_GRANTABLE.forEach((k) => (permissions[k] = { ...FULL }))
              const profId = addProfile({ entityId, name: L('Administrator', 'مدير'), permissions })
              const adminVId = addVirtual({
                entityId,
                positionId: posId,
                positionName: 'Administrator',
                structure: {},
                profileIds: [profId],
                delegationSubjects: [],
                delegationLimits: [],
                delegationDisplay: true,
                delegateOthers: true,
                duration: { open: true },
                displayHistory: true,
                location: 'contacts',
                linkedNormalId: adminNId,
              })
              // System message to the new admin with the org internal code.
              sendSystemMessage(
                { kind: 'virtual', virtualId: adminVId },
                [{ kind: 'normal', normalId: adminNId }],
                L('Your administrator account is ready', 'حساب المدير الخاص بك جاهز'),
                L(
                  `You are now the administrator of ${ent?.commercialName ?? ''}. Organization internal code: ${entityCode}.`,
                  `أنت الآن مدير ${ent?.commercialName ?? ''}. كود المؤسسة الداخلي: ${entityCode}.`,
                ),
              )
              // Hand authority to the admin — the creator no longer administers it.
              updateEntity(entityId, { adminNormalId: adminNId, managingDirectorNormalId: adminNId })
              activateEntity(entityId)
              navigate('/settings/entities')
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
          <Button onClick={goNext} className="flex-1" disabled={(step === 1 && !step2Valid) || (step === 7 && !adminNId)}>
            {t('next')} <ArrowRight size={16} className="rtl:rotate-180" />
          </Button>
        )}
      </div>
    </div>
  )
}

// ── Step 1 ────────────────────────────────────────────────────────────────────
// ── Administrator step ────────────────────────────────────────────────────────
function AdminStep({
  L,
  normals,
  adminNId,
  setAdminNId,
}: {
  L: (en: string, ar: string) => string
  normals: import('@/types').NormalCharacter[]
  adminNId: string
  setAdminNId: (id: string) => void
}) {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Shield size={18} className="text-gate-600" />
        <h3 className="text-sm font-bold">{L('Administrator', 'المدير')}</h3>
      </div>
      <p className="text-xs leading-relaxed text-slate-500">
        {L(
          'Choose the natural person who will administer this organization. On activation they receive a full-authority Administrator account and control is handed over to them — you will no longer administer it (unless you choose yourself).',
          'اختر الشخص الطبيعي الذي سيدير هذه المؤسسة. عند التفعيل يحصل على حساب "مدير" بصلاحية كاملة وتُسلَّم الإدارة إليه — ولن تديرها بعد ذلك (إلا إذا اخترت نفسك).',
        )}
      </p>
      <Field label={L('Administrator', 'المدير')} required>
        <Select value={adminNId} onChange={(e) => setAdminNId(e.target.value)}>
          <option value="">—</option>
          {normals.map((n) => (
            <option key={n.id} value={n.id}>{n.fullName}</option>
          ))}
        </Select>
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
}: {
  L: (en: string, ar: string) => string
  lang: 'en' | 'ar'
  entityId: string | null
  myStructures: import('@/types').StructureNode[]
}) {
  if (!entityId) return <NeedDraft L={L} />
  return (
    <div className="space-y-3">
      {STRUCTURE_KINDS.map((kind) => (
        <StructureEditor
          key={kind}
          L={L}
          lang={lang}
          kind={kind}
          entityId={entityId}
          nodes={myStructures.filter((n) => n.kind === kind)}
        />
      ))}
    </div>
  )
}

// ── Profiles step ───────────────────────────────────────────────────────────
function ProfilesStep({
  L,
  entityId,
  profiles,
}: {
  L: (en: string, ar: string) => string
  entityId: string | null
  profiles: import('@/types').Profile[]
}) {
  const [profOpen, setProfOpen] = useState(false)
  const [profEdit, setProfEdit] = useState<import('@/types').Profile | null>(null)
  if (!entityId) return <NeedDraft L={L} />
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Shield size={18} className="text-gate-600" />
        <h3 className="text-sm font-bold">{L('Authorization Profiles', 'بروفايلات الصلاحيات')}</h3>
      </div>
      <Button full variant="secondary" onClick={() => { setProfEdit(null); setProfOpen(true) }}>
        <Plus size={14} /> {L('New profile', 'بروفايل جديد')}
      </Button>
      {profiles.length > 0 && (
        <div className="space-y-1.5">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { setProfEdit(p); setProfOpen(true) }}
              className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-start transition hover:bg-slate-100"
            >
              <span className="text-sm font-medium text-slate-700">{p.name}</span>
              <Badge tone="gate">{Object.keys(p.permissions).length} {L('tx', 'معاملة')}</Badge>
            </button>
          ))}
        </div>
      )}
      <ProfileEditor open={profOpen} onClose={() => setProfOpen(false)} entityId={entityId} profile={profEdit} />
    </Card>
  )
}

// ── Delegation Object step ────────────────────────────────────────────────────
function DelegationStep({
  L,
  entityId,
  delegations,
  addDelegation,
}: {
  L: (en: string, ar: string) => string
  entityId: string | null
  delegations: import('@/types').DelegationItem[]
  addDelegation: (d: Omit<import('@/types').DelegationItem, 'id'>) => void
}) {
  const [subject, setSubject] = useState('')
  const [limit, setLimit] = useState('')
  if (!entityId) return <NeedDraft L={L} />
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Shield size={18} className="text-gate-600" />
        <h3 className="text-sm font-bold">{L('Delegation Objects', 'كائنات التفويض')}</h3>
      </div>
      <p className="text-xs text-slate-500">
        {L('Define delegation objects (subject + numeric limit) to grant to virtual accounts when linking.', 'عرّف كائنات التفويض (الموضوع + حد رقمي) لمنحها للحسابات الافتراضية عند الربط.')}
      </p>
      <Field label={L('Subject', 'الموضوع')}>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={L('Approve purchase orders', 'اعتماد أوامر الشراء')} />
      </Field>
      <Field label={L('Limit (amount)', 'الحد (قيمة)')} hint={L('numeric', 'رقمي')}>
        <Input inputMode="numeric" dir="ltr" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^\d]/g, ''))} placeholder="1000000" />
      </Field>
      <Button
        size="sm"
        variant="secondary"
        disabled={!subject.trim()}
        onClick={() => {
          addDelegation({ entityId, subject: subject.trim(), limit: limit.trim(), limitAmount: limit ? Number(limit) : undefined })
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
              {(d.limitAmount != null || d.limit) && <span className="text-slate-400"> · {d.limitAmount != null ? d.limitAmount.toLocaleString() : d.limit}</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ── Step 5 ────────────────────────────────────────────────────────────────────
function Step5({
  L,
  entityId,
  positions,
  addPosition,
  updatePosition,
  removePosition,
}: {
  L: (en: string, ar: string) => string
  entityId: string | null
  positions: import('@/types').Position[]
  addPosition: (entityId: string, name: string) => string
  updatePosition: (id: string, name: string) => void
  removePosition: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
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
        <div className="space-y-1.5">
          {positions.map((p) =>
            editId === p.id ? (
              <div key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-2.5 py-1.5">
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 flex-1 py-0" />
                <Button size="sm" disabled={!editName.trim()} onClick={() => { updatePosition(p.id, editName.trim()); setEditId(null) }}>
                  {L('Save', 'حفظ')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>{L('Cancel', 'إلغاء')}</Button>
              </div>
            ) : (
              <div key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                <Briefcase size={14} className="shrink-0 text-gate-600" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{p.name}</span>
                <button onClick={() => { setEditId(p.id); setEditName(p.name) }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-gate-600" aria-label={L('Edit', 'تعديل')}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => removePosition(p.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label={L('Delete', 'حذف')}>
                  <Trash2 size={13} />
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </Card>
  )
}

// ── Step 6 ────────────────────────────────────────────────────────────────────
function Step6({
  L,
  entity,
  virtuals,
  removeVirtual,
}: {
  L: (en: string, ar: string) => string
  entity: LegalEntity | undefined
  virtuals: import('@/types').VirtualCharacter[]
  removeVirtual: (id: string) => void
}) {
  const { t } = useLang()
  const [editId, setEditId] = useState<string | null>(null)
  const [displayId, setDisplayId] = useState<string | null>(null)
  if (!entity) return <NeedDraft L={L} />

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 text-slate-800">
        <Users size={18} className="text-gate-600" />
        <h3 className="text-sm font-bold">{t('virtualEntity')}</h3>
      </div>

      <VirtualEntityForm entityId={entity.id} />

      {virtuals.length > 0 && (
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          {virtuals.map((v) => (
            <div key={v.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold text-slate-700">{v.positionName}</div>
                <div className="truncate font-address text-[10px] text-gate-700" dir="ltr">{unlinkedAddress(v, entity)}</div>
              </div>
              <button onClick={() => setDisplayId(v.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-gate-600" aria-label={t('display')}>
                <Eye size={13} />
              </button>
              <button onClick={() => setEditId(v.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-gate-600" aria-label={t('edit')}>
                <Pencil size={13} />
              </button>
              <button onClick={() => removeVirtual(v.id)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500" aria-label={t('delete')}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Sheet open={!!editId} onClose={() => setEditId(null)} title={t('editVirtualEntity')}>
        {editId && <VirtualEntityForm entityId={entity.id} virtualId={editId} onDone={() => setEditId(null)} />}
      </Sheet>
      <Sheet open={!!displayId} onClose={() => setDisplayId(null)} title={t('displayVirtualEntity')}>
        {displayId && <VirtualEntityDetail virtualId={displayId} />}
      </Sheet>
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
