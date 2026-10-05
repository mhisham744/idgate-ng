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
import type { ActorRef, Industry, Vacancy } from '@/types'

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

  const activeVirtual = active?.kind === 'virtual' ? virtual(active.virtualId) : undefined
  const canApply = active?.kind === 'normal' && can('tool.displayVacancy')
  const canPost = active?.kind === 'virtual' && can('tool.createVacancy') && !!activeVirtual

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [industry, setIndustry] = useState<Industry | ''>('')
  const [description, setDescription] = useState('')

  const sorted = [...vacancies].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function submit() {
    if (!activeVirtual || !title.trim()) return
    postVacancy({
      entityId: activeVirtual.entityId,
      title: title.trim(),
      positionName: activeVirtual.positionName,
      location: location.trim() || undefined,
      industry: industry || undefined,
      description: description.trim(),
    })
    setTitle('')
    setLocation('')
    setIndustry('')
    setDescription('')
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
          {t('postVacancy')}
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

                {v.status === 'closed' && (
                  <Badge tone="slate"><Lock size={10} /> {t('closed')}</Badge>
                )}

                {canApply && v.status !== 'closed' && (
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
        title={t('postVacancy')}
        footer={
          <Button full onClick={submit} disabled={!title.trim()}>
            {t('postVacancy')}
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label={L('Title', 'المسمى')} required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={L('Location', 'الموقع')}>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field label={L('Industry', 'المجال')}>
            <Select value={industry} onChange={(e) => setIndustry(e.target.value as Industry)}>
              <option value="">{L('Select', 'اختر')}</option>
              {(Object.keys(INDUSTRY_LABELS) as Industry[]).map((k) => (
                <option key={k} value={k}>
                  {bl(INDUSTRY_LABELS[k], lang)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={L('Description', 'الوصف')}>
            <Textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
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
