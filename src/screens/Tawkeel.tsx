import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, ScrollText, ShieldCheck, History, Send, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ActorRef, Tawkeel as TawkeelT, Validity } from '@/types'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { TAWKEEL_STATUS_LABELS } from '@/data/reference'
import { actorKey, uid, formatDate } from '@/lib/identity'
import { useResolveActor, ActorLine } from '@/components/identity'
import { RecipientPicker } from '@/components/RecipientPicker'
import { useDirectory } from '@/lib/userScope'
import { credentialPayload, hashObject, makeSerial, simulatedSignature, tawkeelPayload } from '@/lib/crypto'
import { Badge, Button, Card, Chip, EmptyState, Field, Input, Modal, Sheet, Toggle } from '@/ui/primitives'

export function Tawkeel() {
  const navigate = useNavigate()
  const { lang, t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const active = useStore((s) => s.active)
  const tawkeelsGrantedBy = useStore((s) => s.tawkeelsGrantedBy)
  const tawkeelsGrantedTo = useStore((s) => s.tawkeelsGrantedTo)
  const revokeTawkeel = useStore((s) => s.revokeTawkeel)
  const sendSystemMessage = useStore((s) => s.sendSystemMessage)
  const resolve = useResolveActor()
  // Subscribe to the tawkeels array so grant/revoke/show re-run the memos below.
  const tawkeels = useStore((s) => s.tawkeels)

  const [tab, setTab] = useState<'by' | 'to'>('by')
  const [grantOpen, setGrantOpen] = useState(false)
  const [auditOf, setAuditOf] = useState<TawkeelT | null>(null)
  const [showOf, setShowOf] = useState<TawkeelT | null>(null)

  const granted = useMemo(() => (active ? tawkeelsGrantedBy(active as ActorRef) : []), [active, tawkeelsGrantedBy, tawkeels])
  const received = useMemo(() => (active ? tawkeelsGrantedTo(active as ActorRef) : []), [active, tawkeelsGrantedTo, tawkeels])
  const list = tab === 'by' ? granted : received

  // Revoke (grantor side) → no-reply notices to the grantee and to anyone the
  // grantee had shown the tawkeel to.
  const revoke = (tk: TawkeelT) => {
    revokeTawkeel(tk.id)
    if (!active) return
    const grantor = active as ActorRef
    const body = `${L('A tawkeel granted to you is no longer valid.', 'لم يعد التوكيل الممنوح لك ساريًا.')}\n${L('Subject', 'الموضوع')}: ${tk.subject}`
    sendSystemMessage(grantor, [tk.grantee], L('Tawkeel Revoked', 'تم إلغاء التوكيل'), body)
    if (tk.shownTo && tk.shownTo.length > 0) {
      sendSystemMessage(
        grantor,
        tk.shownTo,
        L('Delegation Revoked', 'تم إلغاء التفويض'),
        `${L('A delegation that was shown to you is no longer valid.', 'لم يعد التفويض الذي عُرض عليك ساريًا.')}\n${L('Subject', 'الموضوع')}: ${tk.subject}`,
      )
    }
  }

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
              resolveName={(r) => resolve(r).displayName}
              onRevoke={tab === 'by' && tk.status === 'active' ? () => revoke(tk) : undefined}
              onShow={tab === 'to' && tk.status === 'active' ? () => setShowOf(tk) : undefined}
              onAudit={() => setAuditOf(tk)}
            />
          ))}
        </div>
      )}

      <GrantTawkeelSheet open={grantOpen} onClose={() => setGrantOpen(false)} />
      <ShowTawkeelSheet tk={showOf} onClose={() => setShowOf(null)} />

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
                      {a.action === 'granted'
                        ? t('tawkeelGranted')
                        : a.action === 'revoked'
                          ? t('tawkeelRevoked')
                          : a.action === 'shown'
                            ? L('Shown to others', 'عُرض على آخرين')
                            : t('tawkeelExercised')}
                    </div>
                    <div className="text-xs text-slate-500">{formatDate(a.at, lang)}</div>
                    {a.note && a.action !== 'shown' && <div className="text-xs text-slate-500">{a.note}</div>}
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

function TawkeelCard({
  tk,
  side,
  resolveName,
  onRevoke,
  onShow,
  onAudit,
}: {
  tk: TawkeelT
  side: 'by' | 'to'
  resolveName: (r: ActorRef) => string
  onRevoke?: () => void
  onShow?: () => void
  onAudit: () => void
}) {
  const { lang, t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const shown = tk.shownTo ?? []
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
      {side === 'to' && shown.length > 0 && (
        <div className="rounded-2xl border border-slate-100 p-2.5">
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <Users size={11} /> {L('Shown to', 'عُرض على')} · {shown.length}
          </div>
          <div className="text-xs text-slate-600">{shown.map(resolveName).join('، ')}</div>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck size={13} className="text-emerald-600" />
        <span dir="ltr" className="font-mono">{tk.serial}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="subtle" size="sm" onClick={onAudit}>{t('auditTrail')}</Button>
        {onShow && (
          <Button variant="secondary" size="sm" onClick={onShow}>
            <Send size={13} className="me-1" /> {L('Delegation Show', 'عرض التفويض')}
          </Button>
        )}
        {onRevoke && (
          <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={onRevoke}>{t('revoke')}</Button>
        )}
      </div>
    </Card>
  )
}

// ── Grant Tawkeel (Granted-by-me tab) ─────────────────────────────────────────
function GrantTawkeelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const active = useStore((s) => s.active)
  const virtual = useStore((s) => s.virtual)
  const delegations = useStore((s) => s.delegations)
  const grantTawkeel = useStore((s) => s.grantTawkeel)
  const issueCredential = useStore((s) => s.issueCredential)
  const sendSystemMessage = useStore((s) => s.sendSystemMessage)
  const resolve = useResolveActor()
  const dir = useDirectory()

  const [refs, setRefs] = useState<ActorRef[]>([])
  const [delId, setDelId] = useState('')
  const [subject, setSubject] = useState('')
  const [validity, setValidity] = useState<Validity>({ open: true })
  const [busy, setBusy] = useState(false)

  // Delegations come from the acting (virtual) account's organization catalog.
  const activeVirtual = active?.kind === 'virtual' ? virtual(active.virtualId) : undefined
  const entDelegations = useMemo(
    () => (activeVirtual ? delegations.filter((d) => d.entityId === activeVirtual.entityId) : []),
    [activeVirtual, delegations],
  )
  const hasDelegations = entDelegations.length > 0
  const selectedDel = entDelegations.find((d) => d.id === delId)
  // Grantee is picked from THIS account's directory (per-account independence).
  const options = dir.people

  // Subject is driven by the chosen delegation; free text only when there are none.
  const effectiveSubject = selectedDel ? selectedDel.subject : subject.trim()
  const grantee = refs[0]
  const canSubmit = !!grantee && !!effectiveSubject && (hasDelegations ? !!selectedDel : true) && !busy

  const fmtVal = (v: Validity) => (v.open ? L('Open-ended', 'مفتوحة') : `${v.from || '—'} → ${v.to || '—'}`)

  const reset = () => {
    setRefs([]); setDelId(''); setSubject(''); setValidity({ open: true })
  }

  // Reset the form whenever the sheet is dismissed (the component stays mounted),
  // so reopening never shows a stale grantee / delegation / validity.
  useEffect(() => {
    if (!open) reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async () => {
    if (!grantee || !active || !canSubmit || busy) return
    setBusy(true)
    try {
      const grantor = active as ActorRef
      const serial = makeSerial('TWK', Date.now() % 1_000_000)
      const grantedAt = new Date().toISOString()
      const limitAmount = selectedDel?.limitAmount
      const limitText = selectedDel ? (selectedDel.limitAmount != null ? String(selectedDel.limitAmount) : selectedDel.limit || undefined) : undefined
      const base = {
        id: uid('twk'), serial, grantor, grantee, subject: effectiveSubject,
        scopeEntityId: activeVirtual?.entityId, limitText, limitAmount, validity, grantedAt,
      }
      const hash = await hashObject(tawkeelPayload(base as any))
      const signature = await simulatedSignature(hash, actorKey(grantor))

      // Mint a wallet credential for the grantee alongside the tawkeel.
      const credSerial = makeSerial('CRD', Date.now() % 1_000_000, 'twk')
      const credClaims = [
        { label: L('Subject', 'الموضوع'), value: effectiveSubject },
        ...(limitText ? [{ label: L('Max. amount', 'أقصى مبلغ'), value: limitText }] : []),
        { label: L('Validity', 'الصلاحية'), value: fmtVal(validity) },
      ]
      const credTitle = `${t('tawkeel')} — ${effectiveSubject}`
      const credPayload = credentialPayload({ serial: credSerial, credType: 'tawkeel', issuer: grantor, holder: grantee, title: credTitle, claims: credClaims, issuedAt: grantedAt, validity } as any)
      const credHash = await hashObject(credPayload)
      const credSig = await simulatedSignature(credHash, actorKey(grantor))
      const credId = issueCredential(
        { credType: 'tawkeel', holder: grantee, title: credTitle, claims: credClaims, validity, sourceKind: 'tawkeel', sourceId: base.id },
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

      // No-reply notice to the grantee.
      sendSystemMessage(
        grantor,
        [grantee],
        L('Tawkeel Granted', 'تم منح التوكيل'),
        [
          L('A digital tawkeel has been granted to you.', 'تم منحك توكيلًا رقميًا.'),
          `${L('Subject', 'الموضوع')}: ${effectiveSubject}`,
          ...(limitText ? [`${L('Max. amount', 'أقصى مبلغ')}: ${limitText}`] : []),
          `${L('Validity', 'الصلاحية')}: ${fmtVal(validity)}`,
        ].join('\n'),
      )
      onClose()
      reset()
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

        {hasDelegations ? (
          <Field label={L('Delegation', 'التفويض')} required>
            <select
              value={delId}
              onChange={(e) => setDelId(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:border-gate-400 focus:outline-none"
            >
              <option value="">{L('Select a delegation…', 'اختر تفويضًا…')}</option>
              {entDelegations.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.subject}
                  {d.limitAmount != null ? ` — ${L('max', 'أقصى')} ${d.limitAmount.toLocaleString()}` : ''}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label={t('subject')} required>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={isRtl ? 'مثال: توقيع التحويلات البنكية' : 'e.g. Sign bank transfers'} />
          </Field>
        )}

        {selectedDel && (
          <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-700">{selectedDel.subject}</div>
            {selectedDel.limitAmount != null && <div>{L('Max. amount per subject', 'أقصى مبلغ لكل موضوع')}: {selectedDel.limitAmount.toLocaleString()}</div>}
            {selectedDel.authorizationsRequired != null && <div>{L('Number of authorizations', 'عدد التفويضات')}: {selectedDel.authorizationsRequired}</div>}
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5">
            <span className="text-sm text-slate-700">{t('validity')}: {validity.open ? L('Open-ended', 'مفتوحة') : L('Limited', 'محدودة')}</span>
            <Toggle checked={validity.open} onChange={(open) => setValidity((v) => ({ ...v, open }))} />
          </div>
          {!validity.open && (
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={validity.from ?? ''} onChange={(e) => setValidity((v) => ({ ...v, open: false, from: e.target.value }))} />
              <Input type="date" value={validity.to ?? ''} onChange={(e) => setValidity((v) => ({ ...v, open: false, to: e.target.value }))} />
            </div>
          )}
        </div>
        <p className="pt-1 text-[11px] text-slate-400">{t('signatureSimulated')}</p>
      </div>
    </Sheet>
  )
}

// ── Delegation Show (Granted-to-me tab) ───────────────────────────────────────
function ShowTawkeelSheet({ tk, onClose }: { tk: TawkeelT | null; onClose: () => void }) {
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const active = useStore((s) => s.active)
  const showTawkeel = useStore((s) => s.showTawkeel)
  const sendSystemMessage = useStore((s) => s.sendSystemMessage)
  const resolve = useResolveActor()
  const dir = useDirectory()

  const [refs, setRefs] = useState<ActorRef[]>([])
  const [busy, setBusy] = useState(false)

  // Recipients are limited to the grantee's own directory, and cannot include
  // the original grantor.
  const meKey = active ? actorKey(active) : ''
  const grantorKey = tk ? actorKey(tk.grantor) : ''
  const options = dir.people.filter((r) => actorKey(r) !== meKey && actorKey(r) !== grantorKey)

  const close = () => { setRefs([]); onClose() }

  const submit = () => {
    if (!tk || !active || refs.length === 0 || busy) return
    setBusy(true)
    try {
      const me = active as ActorRef
      showTawkeel(tk.id, refs)
      sendSystemMessage(
        me,
        refs,
        L('Delegation Show', 'عرض تفويض'),
        [
          L('A delegation granted to me has been shown to you.', 'تم عرض تفويض مُمنوح لي عليك.'),
          `${L('Subject', 'الموضوع')}: ${tk.subject}`,
          `${L('Originally granted by', 'الجهة المانحة الأصلية')}: ${resolve(tk.grantor).displayName}`,
        ].join('\n'),
      )
      close()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={!!tk}
      onClose={close}
      title={L('Delegation Show', 'عرض التفويض')}
      footer={<Button full onClick={submit} disabled={refs.length === 0 || busy}><Send size={15} className="me-1.5" /> {t('send')}</Button>}
    >
      <div className="space-y-3">
        {tk && (
          <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
            <div className="font-semibold text-slate-700">{tk.subject}</div>
            <div>{L('Granted by', 'مُنح بواسطة')}: {resolve(tk.grantor).displayName}</div>
          </div>
        )}
        <p className="text-xs text-slate-500">
          {L('Show this delegation to people in your directory. Each gets a no-reply notice.', 'اعرض هذا التفويض على أشخاص في دليلك. يصل كلًا منهم إشعار بلا رد.')}
        </p>
        <RecipientPicker
          label={t('to')}
          required
          options={options}
          groups={[]}
          refs={refs}
          groupIds={[]}
          onChangeRefs={setRefs}
          onChangeGroupIds={() => {}}
          resolveName={(r) => resolve(r).displayName}
          resolveLabel={(r) => `${resolve(r).displayName} · ${resolve(r).address}`}
          placeholder={t('searchRecipients')}
          isRtl={isRtl}
        />
      </div>
    </Sheet>
  )
}
