import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Briefcase, MapPin, Building2, Users, Plus, UserCheck, Star, Lock } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { actorKey, relativeTime, uid } from '@/lib/identity'
import { credentialPayload, hashObject, makeSerial, simulatedSignature } from '@/lib/crypto'
import {
  Button,
  Card,
  Badge,
  Field,
  Input,
  Textarea,
  Select,
  EmptyState,
  Sheet,
} from '@/ui/primitives'
import { INDUSTRY_LABELS } from '@/data/reference'
import type { ActorRef, Country, Industry, Vacancy } from '@/types'

const COUNTRIES: Country[] = ['Egypt', 'USA', 'France', 'Germany', 'India']

export function Vacancies() {
  const navigate = useNavigate()
  const { lang, t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const vacancies = useStore((s) => s.vacancies)
  const entity = useStore((s) => s.entity)
  const virtual = useStore((s) => s.virtual)
  const active = useStore((s) => s.active)
  const normalId = useStore((s) => s.normalId)
  const can = useStore((s) => s.can)
  const applyVacancy = useStore((s) => s.applyVacancy)
  const postVacancy = useStore((s) => s.postVacancy)
  const matchVacancyCandidates = useStore((s) => s.matchVacancyCandidates)
  const sendMessage = useStore((s) => s.sendMessage)

  const activeVirtual = active?.kind === 'virtual' ? virtual(active.virtualId) : undefined
  const canApply = active?.kind === 'normal' && can('tool.displayVacancy')
  const canPost = active?.kind === 'virtual' && can('tool.createVacancy') && !!activeVirtual

  const [open, setOpen] = useState(false)
  const empty = {
    title: '',
    description: '',
    country: '',
    city: '',
    workingHours: '' as '' | 'full-time' | 'part-time',
    workingLocation: '' as '' | 'on-site' | 'remote',
    industry: '' as Industry | '',
    requiredQualification: '',
    requiredSkills: '',
    mandatoryRequirements: '',
    keyResponsibilities: '',
    whatWeOffer: '',
    prefGender: '' as '' | 'Male' | 'Female',
    prefAgeFrom: '',
    prefAgeTo: '',
    prefNationalities: [] as Country[],
    prefResidence: [] as Country[],
    searchVisibility: 'public' as 'public' | 'directory' | 'closed',
    validUntil: '',
    notificationAlert: 'yes' as 'yes' | 'no',
  }
  const [form, setForm] = useState(empty)
  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => setForm((f) => ({ ...f, [k]: v }))
  const toggleCountry = (field: 'prefNationalities' | 'prefResidence', c: Country) =>
    setForm((f) => ({ ...f, [field]: f[field].includes(c) ? f[field].filter((x) => x !== c) : [...f[field], c] }))

  const mandatoryOk =
    form.title.trim() &&
    form.description.trim() &&
    form.country.trim() &&
    form.city.trim() &&
    form.workingHours &&
    form.workingLocation &&
    form.validUntil

  const sorted = [...vacancies]
    .filter((v) => v.status !== 'draft' || (activeVirtual && v.entityId === activeVirtual.entityId))
    .filter((v) => {
      // Search Visibility: public → everyone; directory/closed → the posting entity's accounts.
      if ((v.searchVisibility ?? 'public') === 'public') return true
      return !!activeVirtual && v.entityId === activeVirtual.entityId
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const isExpired = (v: Vacancy) => !!v.validUntil && new Date(`${v.validUntil}T23:59:59`).getTime() < Date.now()

  function submit(doPost: boolean) {
    if (!activeVirtual || !mandatoryOk) return
    const payload = {
      entityId: activeVirtual.entityId,
      title: form.title.trim(),
      positionName: activeVirtual.positionName,
      description: form.description.trim(),
      industry: form.industry || undefined,
      country: form.country.trim() || undefined,
      city: form.city.trim() || undefined,
      location: [form.city.trim(), form.country.trim()].filter(Boolean).join(', ') || undefined,
      workingHours: form.workingHours || undefined,
      workingLocation: form.workingLocation || undefined,
      requiredQualification: form.requiredQualification.trim() || undefined,
      requiredSkills: form.requiredSkills.trim() || undefined,
      mandatoryRequirements: form.mandatoryRequirements.trim() || undefined,
      keyResponsibilities: form.keyResponsibilities.trim() || undefined,
      whatWeOffer: form.whatWeOffer.trim() || undefined,
      prefGender: form.prefGender || undefined,
      prefAgeFrom: form.prefAgeFrom ? Number(form.prefAgeFrom) : undefined,
      prefAgeTo: form.prefAgeTo ? Number(form.prefAgeTo) : undefined,
      prefNationalities: form.prefNationalities.length ? form.prefNationalities : undefined,
      prefResidence: form.prefResidence.length ? form.prefResidence : undefined,
      searchVisibility: form.searchVisibility,
      validUntil: form.validUntil || undefined,
      notificationAlert: form.notificationAlert === 'yes',
      status: (doPost ? 'open' : 'draft') as 'open' | 'draft',
    }
    const id = postVacancy(payload)
    // On Save & post with the alert on, message every matching opted-in candidate.
    if (doPost && form.notificationAlert === 'yes' && id) {
      const temp = { ...payload, id, createdAt: '', applicants: [], postedByVirtualId: '' } as Vacancy
      const matches = matchVacancyCandidates(temp)
      const body = `${form.title.trim()} — ${[form.city.trim(), form.country.trim()].filter(Boolean).join(', ')}\n\n${form.description.trim()}`
      matches.forEach((nid) =>
        sendMessage({ to: [{ kind: 'normal', normalId: nid }], subject: `Vacancy — ${form.title.trim()}`, body }),
      )
    }
    setForm(empty)
    setOpen(false)
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} className={isRtl ? 'rotate-180 me-1.5' : 'me-1.5'} />
        {t('back')}
      </Button>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800">{t('vacancies')}</h1>
        <p className="text-sm text-slate-500">
          {L(
            'Positions published by legal entities. Persons can search and apply; entities can post through an authorized virtual account.',
            'وظائف تنشرها الجهات الاعتبارية. يمكن للأفراد البحث والتقديم، وللجهات النشر عبر حساب افتراضي مخوّل.',
          )}
        </p>
      </div>

      {canPost && (
        <Button full onClick={() => setOpen(true)}>
          <Plus size={16} className="me-1.5" />
          {t('createVacancy')}
        </Button>
      )}

      {sorted.length === 0 ? (
        <EmptyState icon={<Briefcase size={28} />} title={t('empty')} subtitle={t('vacancies')} />
      ) : (
        <div className="space-y-3">
          {sorted.map((v) => {
            const ent = entity(v.entityId)
            const applied = !!normalId && v.applicants.includes(normalId)
            return (
              <Card key={v.id} className="p-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-800">{v.title}</h2>
                    <span className="shrink-0 text-xs text-slate-400">{relativeTime(v.createdAt, lang)}</span>
                  </div>
                  {ent && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Building2 size={14} className="text-slate-400" />
                      {ent.commercialName}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {v.location && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {v.location}
                      </span>
                    )}
                    {v.industry && <Badge tone="teal">{bl(INDUSTRY_LABELS[v.industry], lang)}</Badge>}
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {v.applicants.length}
                    </span>
                  </div>
                </div>

                {v.description && <p className="text-sm text-slate-600">{v.description}</p>}

                {(v.status === 'closed' || isExpired(v)) && (
                  <Badge tone="slate"><Lock size={10} /> {isExpired(v) ? t('expired') : t('closed')}</Badge>
                )}
                {v.status === 'draft' && <Badge tone="amber">{t('draft')}</Badge>}

                {canApply && v.status !== 'closed' && v.status !== 'draft' && !isExpired(v) && (
                  <Button
                    full
                    variant={applied ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={applied}
                    onClick={() => applyVacancy(v.id)}
                  >
                    {applied ? t('applied') : t('apply')}
                  </Button>
                )}

                {active?.kind === 'virtual' && activeVirtual?.entityId === v.entityId && can('tool.talentAcquisition') && (
                  <ManageVacancy v={v} />
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t('createVacancy')}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" full disabled={!mandatoryOk} onClick={() => submit(false)}>
              {t('save')}
            </Button>
            <Button full disabled={!mandatoryOk} onClick={() => submit(true)}>
              {t('saveAndPost')}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('jobDetails')}</div>
          <Field label={L('Organization', 'المؤسسة')}>
            <Input value={entity(activeVirtual?.entityId ?? '')?.commercialName ?? ''} disabled />
          </Field>
          <Field label={L('Job name', 'اسم الوظيفة')} required>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label={L('Job description', 'وصف الوظيفة')} required>
            <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L('Country', 'الدولة')} required>
              <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
            </Field>
            <Field label={L('City', 'المدينة')} required>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L('Working hours', 'ساعات العمل')} required>
              <Select value={form.workingHours} onChange={(e) => set('workingHours', e.target.value as typeof empty.workingHours)}>
                <option value="">{L('Select', 'اختر')}</option>
                <option value="full-time">{L('Full-time', 'دوام كامل')}</option>
                <option value="part-time">{L('Part-time', 'دوام جزئي')}</option>
              </Select>
            </Field>
            <Field label={L('Working location', 'مكان العمل')} required>
              <Select value={form.workingLocation} onChange={(e) => set('workingLocation', e.target.value as typeof empty.workingLocation)}>
                <option value="">{L('Select', 'اختر')}</option>
                <option value="on-site">{L('On-site', 'في الموقع')}</option>
                <option value="remote">{L('Remote', 'عن بُعد')}</option>
              </Select>
            </Field>
          </div>
          <Field label={L('Industry', 'المجال')}>
            <Select value={form.industry} onChange={(e) => set('industry', e.target.value as Industry)}>
              <option value="">{L('Select', 'اختر')}</option>
              {(Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => (
                <option key={k} value={k}>{bl(INDUSTRY_LABELS[k], lang)}</option>
              ))}
            </Select>
          </Field>
          <Field label={L('Required qualification', 'المؤهل المطلوب')} hint={t('optional')}>
            <Textarea rows={2} value={form.requiredQualification} onChange={(e) => set('requiredQualification', e.target.value)} />
          </Field>
          <Field label={L('Required skills', 'المهارات المطلوبة')} hint={t('optional')}>
            <Textarea rows={2} value={form.requiredSkills} onChange={(e) => set('requiredSkills', e.target.value)} />
          </Field>
          <Field label={L('Mandatory requirements', 'متطلبات إلزامية')} hint={t('optional')}>
            <Textarea rows={2} value={form.mandatoryRequirements} onChange={(e) => set('mandatoryRequirements', e.target.value)} />
          </Field>
          <Field label={L('Key responsibilities', 'المسؤوليات الرئيسية')} hint={t('optional')}>
            <Textarea rows={2} value={form.keyResponsibilities} onChange={(e) => set('keyResponsibilities', e.target.value)} />
          </Field>
          <Field label={L('What we offer', 'ما نقدمه')} hint={t('optional')}>
            <Textarea rows={2} value={form.whatWeOffer} onChange={(e) => set('whatWeOffer', e.target.value)} />
          </Field>

          <div className="border-t border-slate-200 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('preferredCriteria')}</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L('Gender', 'النوع')} hint={t('optional')}>
              <Select value={form.prefGender} onChange={(e) => set('prefGender', e.target.value as typeof empty.prefGender)}>
                <option value="">{L('Any', 'الكل')}</option>
                <option value="Male">{L('Male', 'ذكر')}</option>
                <option value="Female">{L('Female', 'أنثى')}</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={L('Age from', 'العمر من')} hint={t('optional')}>
                <Input type="number" inputMode="numeric" value={form.prefAgeFrom} onChange={(e) => set('prefAgeFrom', e.target.value)} />
              </Field>
              <Field label={L('to', 'إلى')} hint={t('optional')}>
                <Input type="number" inputMode="numeric" value={form.prefAgeTo} onChange={(e) => set('prefAgeTo', e.target.value)} />
              </Field>
            </div>
          </div>
          <Field label={L('Nationality', 'الجنسية')} hint={t('optional')}>
            <div className="flex flex-wrap gap-1.5">
              {COUNTRIES.map((c) => (
                <Badge key={c} tone={form.prefNationalities.includes(c) ? 'gate' : 'slate'}>
                  <button type="button" onClick={() => toggleCountry('prefNationalities', c)}>{c}</button>
                </Badge>
              ))}
            </div>
          </Field>
          <Field label={L('Residence country', 'بلد الإقامة')} hint={t('optional')}>
            <div className="flex flex-wrap gap-1.5">
              {COUNTRIES.map((c) => (
                <Badge key={c} tone={form.prefResidence.includes(c) ? 'gate' : 'slate'}>
                  <button type="button" onClick={() => toggleCountry('prefResidence', c)}>{c}</button>
                </Badge>
              ))}
            </div>
          </Field>

          <div className="border-t border-slate-200 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('visibilityValidity')}</div>
          <Field label={L('Search visibility', 'ظهور البحث')} required>
            <Select value={form.searchVisibility} onChange={(e) => set('searchVisibility', e.target.value as typeof empty.searchVisibility)}>
              <option value="public">{L('Public', 'عام')}</option>
              <option value="directory">{L('Directory', 'الدليل')}</option>
              <option value="closed">{L('Closed', 'مغلق')}</option>
            </Select>
          </Field>
          <Field label={L('Validity (open until)', 'الصلاحية (مفتوح حتى)')} required>
            <Input type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} />
          </Field>
          <Field label={L('Notification alert', 'تنبيه إشعاري')} required>
            <Select value={form.notificationAlert} onChange={(e) => set('notificationAlert', e.target.value as typeof empty.notificationAlert)}>
              <option value="yes">{L('Yes — message matching candidates', 'نعم — مراسلة المرشحين المطابقين')}</option>
              <option value="no">{L('No', 'لا')}</option>
            </Select>
          </Field>
        </div>
      </Sheet>
    </div>
  )
}

/** Hiring manager for a vacancy: shortlist / hire (mints a role + employment credential) / close. */
function ManageVacancy({ v }: { v: Vacancy }) {
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const active = useStore((s) => s.active)
  const normals = useStore((s) => s.normals)
  const entity = useStore((s) => s.entity)
  const shortlistApplicant = useStore((s) => s.shortlistApplicant)
  const closeVacancy = useStore((s) => s.closeVacancy)
  const hireApplicant = useStore((s) => s.hireApplicant)
  const addVirtual = useStore((s) => s.addVirtual)
  const issueCredential = useStore((s) => s.issueCredential)
  const [busy, setBusy] = useState('')

  const ent = entity(v.entityId)
  const hiredIds = new Set((v.hires ?? []).map((h) => h.normalId))

  const hire = async (normalId: string) => {
    if (!active || busy || !ent) return
    setBusy(normalId)
    try {
      // 1) mint a role virtual for the hire
      const virtualId = addVirtual({
        entityId: v.entityId,
        positionId: `${v.entityId}.pos.${v.title}`,
        positionName: v.title,
        structure: {},
        profileIds: [],
        delegationSubjects: [],
        delegationLimits: [],
        delegationDisplay: true,
        delegateOthers: false,
        duration: { open: true },
        displayHistory: true,
        location: 'contacts',
        linkedNormalId: normalId,
        positionCode: `EMP-${Date.now().toString().slice(-5)}`,
      })
      // 2) issue an employment credential into the hire's wallet
      const issuer = active as ActorRef
      const holder: ActorRef = { kind: 'normal', normalId }
      const serial = makeSerial('CRD', Date.now() % 1_000_000, 'emp')
      const issuedAt = new Date().toISOString()
      const validity = { open: true }
      const title = `${L('Employment', 'إثبات عمل')} — ${ent.commercialName}`
      const claims = [
        { label: L('Position', 'المنصب'), value: v.title },
        { label: L('Employer', 'جهة العمل'), value: ent.commercialName },
        { label: L('Status', 'الحالة'), value: L('Hired', 'تم التوظيف') },
      ]
      const payload = credentialPayload({ serial, credType: 'employment', issuer, holder, title, claims, issuedAt, validity } as any)
      const hash = await hashObject(payload)
      const signature = await simulatedSignature(hash, actorKey(issuer))
      const credentialId = issueCredential(
        { credType: 'employment', holder, title, claims, validity, sourceKind: 'hiring', sourceId: v.id },
        { serial, hash, signature, issuedAt },
      )
      // 3) record the hire
      hireApplicant(v.id, normalId, { virtualId, credentialId: credentialId || undefined })
    } finally {
      setBusy('')
    }
  }

  if (v.applicants.length === 0) {
    return <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-400">{t('applicants')}: 0</div>
  }

  return (
    <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('applicants')} · {v.applicants.length}</span>
        {v.status !== 'closed' && (
          <button type="button" onClick={() => closeVacancy(v.id)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600">
            <Lock size={12} /> {t('closeVacancy')}
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-400">{t('hireDesc')}</p>
      {v.applicants.map((nid) => {
        const n = normals.find((x) => x.id === nid)
        const isShortlisted = v.shortlisted?.includes(nid)
        const isHired = hiredIds.has(nid)
        return (
          <div key={nid} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-slate-800">{n?.fullName ?? nid}</div>
              {isShortlisted && !isHired && <span className="text-[10px] font-semibold uppercase text-amber-600">{t('shortlisted')}</span>}
            </div>
            {isHired ? (
              <Badge tone="green"><UserCheck size={10} /> {t('hired')}</Badge>
            ) : (
              <>
                {!isShortlisted && (
                  <Button size="sm" variant="subtle" onClick={() => shortlistApplicant(v.id, nid)}>
                    <Star size={13} /> {t('shortlist')}
                  </Button>
                )}
                <Button size="sm" variant="primary" disabled={busy === nid} onClick={() => hire(nid)}>
                  <UserCheck size={13} /> {busy === nid ? (isRtl ? '…' : '…') : t('hire')}
                </Button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
