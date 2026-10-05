import { useMemo, useState } from 'react'
import { ArrowLeft, Plus, ScrollText, ShieldCheck, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ActorRef, Tawkeel as TawkeelT } from '@/types'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { TAWKEEL_STATUS_LABELS } from '@/data/reference'
import { actorKey, uid, formatDate } from '@/lib/identity'
import { useResolveActor, ActorLine } from '@/components/identity'
import { RecipientPicker } from '@/components/RecipientPicker'
import { credentialPayload, hashObject, makeSerial, simulatedSignature, tawkeelPayload } from '@/lib/crypto'
import { Badge, Button, Card, Chip, EmptyState, Field, Input, Modal, SectionHeader, Sheet, Toggle } from '@/ui/primitives'

export function Tawkeel() {
  const navigate = useNavigate()
  const { lang, t, isRtl } = useLang()
  const active = useStore((s) => s.active)
  const tawkeelsGrantedBy = useStore((s) => s.tawkeelsGrantedBy)
  const tawkeelsGrantedTo = useStore((s) => s.tawkeelsGrantedTo)
  const revokeTawkeel = useStore((s) => s.revokeTawkeel)
  useStore((s) => s.tawkeels)

  const [tab, setTab] = useState<'by' | 'to'>('by')
  const [grantOpen, setGrantOpen] = useState(false)
  const [auditOf, setAuditOf] = useState<TawkeelT | null>(null)

  const granted = useMemo(() => (active ? tawkeelsGrantedBy(active as ActorRef) : []), [active, tawkeelsGrantedBy])
  const received = useMemo(() => (active ? tawkeelsGrantedTo(active as ActorRef) : []), [active, tawkeelsGrantedTo])
  const list = tab === 'by' ? granted : received

  return (
    <div className="space-y-4 p-4 pb-10">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} className={isRtl ? 'rotate-180 me-1.5' : 'me-1.5'} />
        {t('back')}
      </Button>

      <div>
        <h1 className="text-xl font-bold text-slate-800">{t('tawkeel')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('tawkeelDesc')}</p>
      </div>

      <div className="flex items-center gap-2">
        <Chip active={tab === 'by'} onClick={() => setTab('by')}>{t('grantedByMe')} · {granted.length}</Chip>
        <Chip active={tab === 'to'} onClick={() => setTab('to')}>{t('grantedToMe')} · {received.length}</Chip>
      </div>

      {tab === 'by' && (
        <Button variant="secondary" size="sm" onClick={() => setGrantOpen(true)}>
          <Plus size={15} className="me-1" /> {t('grantTawkeel')}
        </Button>
      )}

      {list.length === 0 ? (
        <EmptyState icon={<ScrollText size={24} />} title={t('noTawkeels')} />
      ) : (
        <div className="space-y-3">
          {list.map((tk) => (
            <TawkeelCard
              key={tk.id}
              tk={tk}
              side={tab}
              onRevoke={tab === 'by' && tk.status === 'active' ? () => revokeTawkeel(tk.id) : undefined}
              onAudit={() => setAuditOf(tk)}
            />
          ))}
        </div>
      )}

      <GrantTawkeelSheet open={grantOpen} onClose={() => setGrantOpen(false)} />

      <Modal open={!!auditOf} onClose={() => setAuditOf(null)}>
        {auditOf && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <History size={18} className="text-gate-600" />
              <h2 className="text-base font-bold text-slate-800">{t('auditTrail')}</h2>
            </div>
            <div className="mb-3 text-sm font-semibold text-slate-700">{auditOf.subject}</div>
            <ol className="space-y-2">
              {auditOf.audit.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gate-500" />
                  <div>
                    <div className="font-medium text-slate-800">
                      {a.action === 'granted' ? t('tawkeelGranted') : a.action === 'revoked' ? t('tawkeelRevoked') : t('tawkeelExercised')}
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(a.at, lang)}</div>
                    {a.note && <div className="text-xs text-slate-500">{a.note}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Modal>
    </div>
  )
}

const STATUS_TONE = { active: 'green', revoked: 'red', expired: 'amber' } as const

function TawkeelCard({ tk, side, onRevoke, onAudit }: { tk: TawkeelT; side: 'by' | 'to'; onRevoke?: () => void; onAudit: () => void }) {
  const { lang, t } = useLang()
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-800">{tk.subject}</div>
          {tk.limitText && <div className="text-xs text-slate-500">{t('limit')}: {tk.limitText}</div>}
        </div>
        <Badge tone={STATUS_TONE[tk.status]} className="shrink-0">{bl(TAWKEEL_STATUS_LABELS[tk.status], lang)}</Badge>
      </div>
      <div className="rounded-2xl bg-slate-50 p-2.5">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {side === 'by' ? t('grantee') : t('grantor')}
        </div>
        <ActorLine actor={side === 'by' ? tk.grantee : tk.grantor} size={32} />
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck size={13} className="text-emerald-600" />
        <span dir="ltr" className="font-mono">{tk.serial}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="subtle" size="sm" onClick={onAudit}>{t('auditTrail')}</Button>
        {onRevoke && (
          <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={onRevoke}>{t('revoke')}</Button>
        )}
      </div>
    </Card>
  )
}

function GrantTawkeelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, isRtl } = useLang()
  const active = useStore((s) => s.active)
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const grantTawkeel = useStore((s) => s.grantTawkeel)
  const issueCredential = useStore((s) => s.issueCredential)
  const resolve = useResolveActor()

  const [refs, setRefs] = useState<ActorRef[]>([])
  const [subject, setSubject] = useState('')
  const [limit, setLimit] = useState('')
  const [openEnded, setOpenEnded] = useState(true)
  const [busy, setBusy] = useState(false)

  const options = useMemo<ActorRef[]>(() => {
    const people: ActorRef[] = normals.map((n) => ({ kind: 'normal', normalId: n.id }))
    const vs: ActorRef[] = virtuals.filter((v) => v.status === 'active').map((v) => ({ kind: 'virtual', virtualId: v.id }))
    return [...people, ...vs]
  }, [normals, virtuals])

  const grantee = refs[0]
  const canSubmit = !!grantee && !!subject.trim() && !busy

  const submit = async () => {
    if (!grantee || !active || busy) return
    setBusy(true)
    try {
      const grantor = active as ActorRef
      const serial = makeSerial('TWK', Date.now() % 1_000_000)
      const grantedAt = new Date().toISOString()
      const validity = { open: openEnded }
      const amountMatch = limit.match(/[\d,]+/)
      const limitAmount = amountMatch ? Number(amountMatch[0].replace(/,/g, '')) : undefined
      const base = { id: uid('twk'), serial, grantor, grantee, subject: subject.trim(), limitText: limit.trim() || undefined, limitAmount, validity, grantedAt }
      const hash = await hashObject(tawkeelPayload(base as any))
      const signature = await simulatedSignature(hash, actorKey(grantor))

      // Mint a wallet credential for the grantee alongside the tawkeel.
      const credSerial = makeSerial('CRD', Date.now() % 1_000_000, 'twk')
      const credClaims = [{ label: isRtl ? 'الموضوع' : 'Subject', value: subject.trim() }, ...(limit.trim() ? [{ label: isRtl ? 'الحد' : 'Limit', value: limit.trim() }] : [])]
      const credPayload = credentialPayload({ serial: credSerial, credType: 'tawkeel', issuer: grantor, holder: grantee, title: `${t('tawkeel')} — ${subject.trim()}`, claims: credClaims, issuedAt: grantedAt, validity } as any)
      const credHash = await hashObject(credPayload)
      const credSig = await simulatedSignature(credHash, actorKey(grantor))
      const credId = issueCredential(
        { credType: 'tawkeel', holder: grantee, title: `${t('tawkeel')} — ${subject.trim()}`, claims: credClaims, validity, sourceKind: 'tawkeel', sourceId: base.id },
        { serial: credSerial, hash: credHash, signature: credSig, issuedAt: grantedAt },
      )

      const tk: TawkeelT = {
        ...base,
        status: 'active',
        hash,
        signature,
        credentialId: credId || undefined,
        audit: [{ at: grantedAt, by: grantor, action: 'granted' }],
      }
      grantTawkeel(tk)
      onClose()
      setRefs([]); setSubject(''); setLimit(''); setOpenEnded(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('grantTawkeel')}
      footer={<Button full onClick={submit} disabled={!canSubmit}>{busy ? (isRtl ? 'جارٍ التوقيع…' : 'Signing…') : t('signGrant')}</Button>}
    >
      <div className="space-y-3">
        <RecipientPicker
          label={t('grantee')}
          required
          options={options}
          groups={[]}
          refs={refs.slice(0, 1)}
          groupIds={[]}
          onChangeRefs={(next) => setRefs(next.slice(-1))}
          onChangeGroupIds={() => {}}
          resolveName={(r) => resolve(r).displayName}
          resolveLabel={(r) => `${resolve(r).displayName} · ${resolve(r).address}`}
          placeholder={isRtl ? 'ابحث عن المُوكَّل إليه…' : 'Search grantee…'}
          isRtl={isRtl}
        />
        <Field label={t('subject')} required>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={isRtl ? 'مثال: توقيع التحويلات البنكية' : 'e.g. Sign bank transfers'} />
        </Field>
        <Field label={t('limit')}>
          <Input value={limit} onChange={(e) => setLimit(e.target.value)} placeholder={isRtl ? 'حتى 1,000,000 ج.م' : 'Up to EGP 1,000,000'} />
        </Field>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
          <span className="text-sm text-slate-700">{t('validity')}: {openEnded ? (isRtl ? 'مفتوحة' : 'Open-ended') : (isRtl ? 'محدودة' : 'Limited')}</span>
          <Toggle checked={openEnded} onChange={setOpenEnded} />
        </div>
        <p className="pt-1 text-[11px] text-slate-400">{t('signatureSimulated')}</p>
      </div>
    </Sheet>
  )
}
