import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ShieldCheck, Search, Check, Send, ScrollText } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { actorKey, uid } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'
import { useDirectory } from '@/lib/userScope'
import { credentialPayload, hashObject, makeSerial, simulatedSignature, tawkeelPayload } from '@/lib/crypto'
import { Button, Card, Field, Input, EmptyState, Badge, cx } from '@/ui/primitives'
import type { ActorRef, Tawkeel, Validity } from '@/types'

/**
 * Delegation Show — a virtual account sends one or more of its organization's
 * delegations to a recipient IN ITS DIRECTORY as signed digital tawkeels. Each
 * selected delegation carries its own validity. On Send, a "no-reply" system
 * message titled "Granted Delegation" is delivered to the recipient, and the
 * grant is recorded in the Log. (Per-account independent; recipients are limited
 * to the acting account's directory.)
 */
export function DelegationShow() {
  const nav = useNavigate()
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const active = useStore((s) => s.active)
  const normals = useStore((s) => s.normals)
  const delegations = useStore((s) => s.delegations)
  const virtual = useStore((s) => s.virtual)
  const sendSystemMessage = useStore((s) => s.sendSystemMessage)
  const grantTawkeel = useStore((s) => s.grantTawkeel)
  const issueCredential = useStore((s) => s.issueCredential)
  const tawkeelsGrantedBy = useStore((s) => s.tawkeelsGrantedBy)
  const resolve = useResolveActor()
  const dir = useDirectory()

  const activeVirtual = active?.kind === 'virtual' ? virtual(active.virtualId) : undefined
  const entDelegations = activeVirtual ? delegations.filter((d) => d.entityId === activeVirtual.entityId) : []
  const log = active ? tawkeelsGrantedBy(active as ActorRef) : []

  const [query, setQuery] = useState('')
  const [target, setTarget] = useState<ActorRef | null>(null)
  const [validated, setValidated] = useState(false)
  // Selected delegations → each with its own validity.
  const [sel, setSel] = useState<Record<string, Validity>>({})
  const [busy, setBusy] = useState(false)
  const [justSent, setJustSent] = useState(false)

  const q = query.trim().toLowerCase()
  // Recipients are limited to THIS account's directory (per-account independence).
  const candidates = useMemo<ActorRef[]>(() => {
    return dir.people.filter((r) => {
      if (!q) return true
      const info = resolve(r)
      const n = normals.find((x) => r.kind === 'normal' && x.id === r.normalId)
      return (
        info.displayName.toLowerCase().includes(q) ||
        (n?.internalCode ?? '').toLowerCase().includes(q) ||
        (n?.contacts.mobile ?? '').replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))
      )
    })
  }, [dir.people, q, resolve, normals])

  const fmtVal = (v: Validity) => (v.open ? L('Open', 'مفتوح') : `${v.from || '—'} → ${v.to || '—'}`)
  const toggleDel = (id: string) =>
    setSel((s) => {
      if (id in s) {
        const next = { ...s }
        delete next[id]
        return next
      }
      return { ...s, [id]: { open: true } }
    })
  const setDelValidity = (id: string, v: Validity) => setSel((s) => ({ ...s, [id]: v }))

  const selectedIds = Object.keys(sel)

  const send = async () => {
    if (!active || !target || selectedIds.length === 0 || busy) return
    setBusy(true)
    try {
      const grantor = active as ActorRef
      const lines: string[] = [L('Delegation of Authority Granted to me:', 'تفويض صلاحية مُمنوح لي:')]
      for (let i = 0; i < selectedIds.length; i++) {
        const delId = selectedIds[i]
        const d = entDelegations.find((x) => x.id === delId)
        if (!d) continue
        const validity = sel[delId]
        const limitStr = d.limitAmount != null ? String(d.limitAmount) : d.limit || '—'
        const grantedAt = new Date().toISOString()
        // Offset the sequence by the loop index so N artifacts minted in the
        // same millisecond get distinct, verifiable serials (verify-by-serial).
        const seq = (Date.now() % 1_000_000) + i
        const serial = makeSerial('TWK', seq)
        const base = {
          id: uid('twk'), serial, grantor, grantee: target, subject: d.subject,
          scopeEntityId: activeVirtual!.entityId, limitText: d.limit || undefined, limitAmount: d.limitAmount,
          validity, grantedAt,
        }
        const hash = await hashObject(tawkeelPayload(base as any))
        const signature = await simulatedSignature(hash, actorKey(grantor))
        const credSerial = makeSerial('CRD', seq, 'twk')
        const credClaims = [
          { label: L('Subject', 'الموضوع'), value: d.subject },
          { label: L('Limit', 'الحد'), value: limitStr },
          { label: L('Validity', 'الصلاحية'), value: fmtVal(validity) },
        ]
        const credTitle = `${t('tawkeel')} — ${d.subject}`
        const credPayload = credentialPayload({ serial: credSerial, credType: 'tawkeel', issuer: grantor, holder: target, title: credTitle, claims: credClaims, issuedAt: grantedAt, validity } as any)
        const credHash = await hashObject(credPayload)
        const credSig = await simulatedSignature(credHash, actorKey(grantor))
        const credId = issueCredential(
          { credType: 'tawkeel', holder: target, title: credTitle, claims: credClaims, validity, sourceKind: 'tawkeel', sourceId: base.id },
          { serial: credSerial, hash: credHash, signature: credSig, issuedAt: grantedAt },
        )
        const tk: Tawkeel = { ...base, status: 'active', hash, signature, credentialId: credId || undefined, audit: [{ at: grantedAt, by: grantor, action: 'granted' }] }
        grantTawkeel(tk)
        lines.push(
          '',
          `${L('Subject', 'الموضوع')}: ${d.subject}`,
          `${L('Maximum Amount', 'أقصى مبلغ')}: ${limitStr}`,
          `${L('Number of Authority', 'عدد التفويضات')}: ${d.authorizationsRequired ?? '—'}`,
          `${L('Validity', 'الصلاحية')}: ${fmtVal(validity)}`,
        )
      }
      // One "no-reply" system notice to the recipient, titled "Granted Delegation".
      sendSystemMessage(grantor, [target], L('Granted Delegation', 'تفويض ممنوح'), lines.join('\n'))
      // Reset — no confirmation step is shown.
      setSel({})
      setTarget(null)
      setValidated(false)
      setJustSent(true)
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
          {L('Send delegations from your directory as signed digital tawkeels. Each selected delegation has its own validity.', 'أرسل تفويضات من دليلك كتوكيلات رقمية موقّعة. لكل تفويض محدد صلاحيته الخاصة.')}
        </p>
      </div>

      {justSent && (
        <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          {L('Sent — a "Granted Delegation" notice was delivered to the recipient.', 'تم الإرسال — وصل إشعار "تفويض ممنوح" إلى المستلم.')}
        </div>
      )}

      {!activeVirtual ? (
        <EmptyState icon={<ShieldCheck size={28} />} title={L('Switch to a virtual account to share a delegation.', 'بدّل إلى حساب افتراضي لمشاركة تفويض.')} />
      ) : (
        <Card className="p-4 space-y-3">
          {!validated ? (
            <>
              <Field label={L('Find recipient (your directory only)', 'ابحث عن مستلم (من دليلك فقط)')}>
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Search…', 'بحث…')} className="ps-9" />
                </div>
              </Field>
              {candidates.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-400">{L('No one in your directory to send to.', 'لا أحد في دليلك للإرسال إليه.')}</p>
              ) : (
                <div className="max-h-64 space-y-1.5 overflow-y-auto thin-scroll pe-0.5">
                  {candidates.map((r) => {
                    const key = r.kind === 'virtual' ? `v:${r.virtualId}` : `n:${r.normalId}`
                    const sl = target && actorKey(target) === actorKey(r)
                    const info = resolve(r)
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTarget(r)}
                        className={cx('flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-start transition', sl ? 'border-gate-400 bg-gate-50' : 'border-slate-100 bg-white hover:bg-slate-50')}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-slate-800">{info.displayName}</div>
                          <div className="truncate font-address text-[10px] text-slate-400" dir="ltr">{info.address}</div>
                        </div>
                        {sl && <Check size={16} className="shrink-0 text-gate-600" />}
                      </button>
                    )
                  })}
                </div>
              )}
              <Button full disabled={!target} onClick={() => { setValidated(true); setJustSent(false) }}>
                {L('Validate recipient', 'التحقق من المستلم')}
              </Button>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-slate-50 p-3">
                <div className="text-xs text-slate-500">{L('Recipient', 'المستلم')}</div>
                <div className="text-sm font-semibold text-slate-800">{target && resolve(target).displayName}</div>
                <div className="font-address text-[11px] text-gate-700" dir="ltr">{target && resolve(target).address}</div>
                <button onClick={() => setValidated(false)} className="mt-1 text-[11px] font-medium text-gate-600">{L('Change', 'تغيير')}</button>
              </div>

              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{L('Select delegations', 'اختر التفويضات')}</div>
              {entDelegations.length === 0 ? (
                <p className="text-xs text-amber-600">{L('This organization has no delegations to share.', 'لا توجد تفويضات لهذه المؤسسة لمشاركتها.')}</p>
              ) : (
                <div className="space-y-2">
                  {entDelegations.map((d) => {
                    const on = d.id in sel
                    const v = sel[d.id] ?? { open: true }
                    return (
                      <div key={d.id} className={cx('rounded-2xl border p-3', on ? 'border-gate-300 bg-gate-50/50' : 'border-slate-100')}>
                        <button type="button" onClick={() => toggleDel(d.id)} className="flex w-full items-center gap-2 text-start">
                          <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-md border', on ? 'border-gate-500 bg-gate-600 text-light' : 'border-slate-300')}>
                            {on && <Check size={13} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800">{d.subject}</span>
                            <span className="block text-[11px] text-slate-400">
                              {d.limitAmount != null ? `${L('Max', 'أقصى')} ${d.limitAmount.toLocaleString()}` : d.limit || '—'}
                              {d.authorizationsRequired != null ? ` · ${L('auth', 'تفويضات')} ${d.authorizationsRequired}` : ''}
                            </span>
                          </span>
                        </button>
                        {on && (
                          <div className="mt-2 space-y-1.5 border-t border-slate-200/60 pt-2">
                            <div className="text-[11px] font-medium text-slate-500">{L('Validity', 'الصلاحية')}</div>
                            <div className="flex gap-2">
                              <button type="button" onClick={() => setDelValidity(d.id, { open: true, from: v.from, to: v.to })} className={cx('rounded-full px-3 py-1 text-xs font-medium', v.open ? 'bg-gate-600 text-light' : 'bg-slate-100 text-slate-600')}>{L('Open', 'مفتوح')}</button>
                              <button type="button" onClick={() => setDelValidity(d.id, { open: false, from: v.from, to: v.to })} className={cx('rounded-full px-3 py-1 text-xs font-medium', !v.open ? 'bg-gate-600 text-light' : 'bg-slate-100 text-slate-600')}>{L('Limited', 'محدود')}</button>
                            </div>
                            {!v.open && (
                              <div className="grid grid-cols-2 gap-2">
                                <Input type="date" value={v.from ?? ''} onChange={(e) => setDelValidity(d.id, { open: false, from: e.target.value, to: v.to })} />
                                <Input type="date" value={v.to ?? ''} onChange={(e) => setDelValidity(d.id, { open: false, from: v.from, to: e.target.value })} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <Button full disabled={selectedIds.length === 0 || busy} onClick={send}>
                <Send size={16} className="me-1.5" /> {busy ? L('Sending…', 'جارٍ الإرسال…') : t('send')}
              </Button>
            </>
          )}
        </Card>
      )}

      {/* Log — delegations this account has sent (and any status changes). */}
      {activeVirtual && log.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <ScrollText size={13} /> {L('Log', 'السجل')}
          </div>
          <Card className="divide-y divide-slate-100">
            {log.map((tk) => (
              <div key={tk.id} className="flex items-center justify-between gap-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-700">{resolve(tk.grantee).displayName}</div>
                  <div className="truncate text-[11px] text-slate-400">{tk.subject}</div>
                </div>
                <Badge tone={tk.status === 'active' ? 'green' : 'slate'}>{tk.status === 'active' ? L('Active', 'نشط') : L('Revoked', 'ملغى')}</Badge>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
