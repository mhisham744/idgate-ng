import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, Search, Check, Send } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { actorKey, uid } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'
import { credentialPayload, hashObject, makeSerial, simulatedSignature, tawkeelPayload } from '@/lib/crypto'
import { Button, Card, Field, Input, Select, EmptyState, Badge, cx } from '@/ui/primitives'
import type { ActorRef, Tawkeel, Validity } from '@/types'

/**
 * Delegation Show — a virtual account grants one of its organization's
 * delegations to a target account as a first-class DIGITAL TAWKEEL: an e-signed,
 * revocable power of attorney, plus a verifiable credential minted into the
 * grantee's wallet and a system notice message.
 */
export function DelegationShow() {
  const nav = useNavigate()
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const active = useStore((s) => s.active)
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const delegations = useStore((s) => s.delegations)
  const virtual = useStore((s) => s.virtual)
  const sendSystemMessage = useStore((s) => s.sendSystemMessage)
  const grantTawkeel = useStore((s) => s.grantTawkeel)
  const issueCredential = useStore((s) => s.issueCredential)
  const resolve = useResolveActor()

  const activeVirtual = active?.kind === 'virtual' ? virtual(active.virtualId) : undefined
  const entDelegations = activeVirtual ? delegations.filter((d) => d.entityId === activeVirtual.entityId) : []

  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<ActorRef | null>(null)
  const [validated, setValidated] = useState(false)
  const [delId, setDelId] = useState('')
  const [valid, setValid] = useState<Validity>({ open: true })
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const meKey = active ? `${active.kind === 'virtual' ? 'v' : 'n'}:${active.kind === 'virtual' ? active.virtualId : active.normalId}` : ''
  const q = query.trim().toLowerCase()
  const candidates = useMemo<ActorRef[]>(() => {
    const opts: ActorRef[] = [
      ...normals.map((n) => ({ kind: 'normal', normalId: n.id }) as ActorRef),
      ...virtuals.filter((v) => v.status === 'active').map((v) => ({ kind: 'virtual', virtualId: v.id }) as ActorRef),
    ]
    return opts.filter((r) => {
      const key = r.kind === 'virtual' ? `v:${r.virtualId}` : `n:${r.normalId}`
      if (key === meKey) return false
      if (!q) return true
      const info = resolve(r)
      const n = normals.find((x) => r.kind === 'normal' && x.id === r.normalId)
      return (
        info.displayName.toLowerCase().includes(q) ||
        (n?.internalCode ?? '').toLowerCase().includes(q) ||
        (n?.contacts.mobile ?? '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
      )
    })
  }, [normals, virtuals, meKey, q, resolve])

  const fmtVal = (v: Validity) => (v.open ? L('Open', 'مفتوح') : `${v.from || '—'} → ${v.to || '—'}`)

  const confirm = async () => {
    if (!active || !target || !delId || busy) return
    const d = entDelegations.find((x) => x.id === delId)
    if (!d) return
    setBusy(true)
    try {
      const grantor = active as ActorRef
      const limitStr = d.limitAmount != null ? String(d.limitAmount) : d.limit || '—'
      const grantedAt = new Date().toISOString()
      const serial = makeSerial('TWK', Date.now() % 1_000_000)
      const base = {
        id: uid('twk'), serial, grantor, grantee: target, subject: d.subject,
        scopeEntityId: activeVirtual!.entityId, limitText: d.limit || undefined, limitAmount: d.limitAmount,
        validity: valid, grantedAt,
      }
      const hash = await hashObject(tawkeelPayload(base as any))
      const signature = await simulatedSignature(hash, actorKey(grantor))

      // Mint a wallet credential for the grantee.
      const credSerial = makeSerial('CRD', Date.now() % 1_000_000, 'twk')
      const credClaims = [{ label: L('Subject', 'الموضوع'), value: d.subject }, { label: L('Limit', 'الحد'), value: limitStr }, { label: L('Validity', 'الصلاحية'), value: fmtVal(valid) }]
      const credTitle = `${t('tawkeel')} — ${d.subject}`
      const credPayload = credentialPayload({ serial: credSerial, credType: 'tawkeel', issuer: grantor, holder: target, title: credTitle, claims: credClaims, issuedAt: grantedAt, validity: valid } as any)
      const credHash = await hashObject(credPayload)
      const credSig = await simulatedSignature(credHash, actorKey(grantor))
      const credId = issueCredential(
        { credType: 'tawkeel', holder: target, title: credTitle, claims: credClaims, validity: valid, sourceKind: 'tawkeel', sourceId: base.id },
        { serial: credSerial, hash: credHash, signature: credSig, issuedAt: grantedAt },
      )

      const tk: Tawkeel = { ...base, status: 'active', hash, signature, credentialId: credId || undefined, audit: [{ at: grantedAt, by: grantor, action: 'granted' }] }
      grantTawkeel(tk)

      const body = [
        L('A digital tawkeel (power of attorney) was granted to you.', 'تم منحك توكيلًا رقميًا.'),
        `${L('Subject', 'الموضوع')}: ${d.subject}`,
        `${L('Limit', 'الحد')}: ${limitStr}`,
        `${L('Validity', 'الصلاحية')}: ${fmtVal(valid)}`,
        `${L('Serial', 'الرقم التسلسلي')}: ${serial}`,
      ].join('\n')
      sendSystemMessage(grantor, [target], `${t('tawkeel')}: ${d.subject}`, body)
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <button onClick={() => nav('/settings')} className="flex items-center gap-1 text-sm font-medium text-slate-500">
        <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''} />
        {t('settings')}
      </button>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-gate-600" />
          <h1 className="text-xl font-bold text-slate-800">{L('Delegation Show', 'عرض التفويض')}</h1>
        </div>
        <p className="text-sm text-slate-500">
          {L('Grant a delegation as a signed digital tawkeel. The grantee receives a verifiable credential in their wallet.', 'امنح تفويضًا كتوكيل رقمي موقّع. يستلم المُوكَّل إليه شهادة موثّقة في محفظته.')}
        </p>
      </div>

      {!activeVirtual ? (
        <EmptyState icon={<ShieldCheck size={28} />} title={L('Switch to a virtual account to share a delegation.', 'بدّل إلى حساب افتراضي لمشاركة تفويض.')} />
      ) : sent ? (
        <Card className="p-4 space-y-3">
          <div className="rounded-2xl bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-700">
            {L('Tawkeel granted — a credential was added to the grantee’s wallet.', 'تم منح التوكيل — وأُضيفت شهادة إلى محفظة المُوكَّل إليه.')}
          </div>
          <Button full variant="secondary" onClick={() => nav('/settings/tawkeel')}>{t('tawkeel')}</Button>
          <Button full variant="ghost" onClick={() => nav('/settings')}>{t('done')}</Button>
        </Card>
      ) : (
        <Card className="p-4 space-y-3">
          {/* Recipient search + select */}
          {!validated ? (
            <>
              <Field label={L('Find recipient (name / internal code / mobile)', 'ابحث عن مستلم (اسم / كود / جوال)')}>
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Search…', 'بحث…')} className="ps-9" />
                </div>
              </Field>
              <div className="max-h-64 space-y-1.5 overflow-y-auto thin-scroll pe-0.5">
                {candidates.map((r) => {
                  const key = r.kind === 'virtual' ? `v:${r.virtualId}` : `n:${r.normalId}`
                  const sel = target && (target.kind === 'virtual' ? `v:${target.virtualId}` : `n:${target.normalId}`) === key
                  const info = resolve(r)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTarget(r)}
                      className={cx('flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-start transition', sel ? 'border-gate-400 bg-gate-50' : 'border-slate-100 bg-white hover:bg-slate-50')}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-800">{info.displayName}</div>
                        <div className="truncate font-address text-[10px] text-slate-400" dir="ltr">{info.address}</div>
                      </div>
                      {sel && <Check size={16} className="shrink-0 text-gate-600" />}
                    </button>
                  )
                })}
              </div>
              <Button full disabled={!target} onClick={() => setValidated(true)}>
                {L('Validate recipient', 'التحقق من المستلم')}
              </Button>
            </>
          ) : (
            <>
              {/* Recipient preview + delegation pick */}
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">{L('Recipient', 'المستلم')}</div>
                <div className="text-sm font-semibold text-slate-800">{target && resolve(target).displayName}</div>
                <div className="font-address text-[11px] text-gate-700" dir="ltr">{target && resolve(target).address}</div>
                <button onClick={() => setValidated(false)} className="mt-1 text-[11px] font-medium text-gate-600">{L('Change', 'تغيير')}</button>
              </div>
              <Field label={L('Delegation', 'التفويض')} required>
                <Select value={delId} onChange={(e) => setDelId(e.target.value)}>
                  <option value="">—</option>
                  {entDelegations.map((d) => (
                    <option key={d.id} value={d.id}>{d.subject}{d.limitAmount != null ? ` (${d.limitAmount.toLocaleString()})` : ''}</option>
                  ))}
                </Select>
              </Field>
              {entDelegations.length === 0 && (
                <p className="text-xs text-amber-600">{L('This organization has no delegations to share.', 'لا توجد تفويضات لهذه المؤسسة لمشاركتها.')}</p>
              )}
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-slate-700">{L('Validity', 'الصلاحية')}</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setValid({ open: true })} className={cx('rounded-full px-3 py-1 text-xs font-medium', valid.open ? 'bg-gate-600 text-light' : 'bg-slate-100 text-slate-600')}>{L('Open', 'مفتوح')}</button>
                  <button type="button" onClick={() => setValid({ open: false, from: valid.from, to: valid.to })} className={cx('rounded-full px-3 py-1 text-xs font-medium', !valid.open ? 'bg-gate-600 text-light' : 'bg-slate-100 text-slate-600')}>{L('Limited', 'محدود')}</button>
                </div>
                {!valid.open && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="date" value={valid.from ?? ''} onChange={(e) => setValid({ ...valid, open: false, from: e.target.value })} />
                    <Input type="date" value={valid.to ?? ''} onChange={(e) => setValid({ ...valid, open: false, to: e.target.value })} />
                  </div>
                )}
              </div>
              <Button full disabled={!delId || busy} onClick={confirm}>
                <Send size={16} className="me-1.5" /> {busy ? L('Signing…', 'جارٍ التوقيع…') : L('Sign & grant', 'توقيع ومنح')}
              </Button>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Badge tone="slate">{L('Note', 'ملاحظة')}</Badge>
                {t('signatureSimulated')}
              </p>
            </>
          )}
        </Card>
      )}
    </div>
  )
}
