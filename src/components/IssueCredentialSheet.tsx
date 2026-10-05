import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { ActorRef, CredentialClaim, CredentialType } from '@/types'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { CRED_TYPE_LABELS } from '@/data/reference'
import { actorKey } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'
import { RecipientPicker } from '@/components/RecipientPicker'
import { credentialPayload, hashObject, makeSerial, simulatedSignature } from '@/lib/crypto'
import { Button, Field, Input, Select, Sheet, cx } from '@/ui/primitives'

const CRED_TYPES: CredentialType[] = ['diploma', 'employment', 'salary', 'license', 'membership']

/**
 * Issue a signed credential from the active (verified) account to a holder.
 * Computes a REAL SHA-256 hash + simulated signature in this async handler, then
 * calls the sync store action. Can be driven with fixed defaults (e.g. hiring).
 */
export function IssueCredentialSheet({
  open,
  onClose,
  onIssued,
  fixedHolder,
  defaults,
}: {
  open: boolean
  onClose: () => void
  onIssued?: (id: string) => void
  fixedHolder?: ActorRef
  defaults?: { credType?: CredentialType; title?: string; claims?: CredentialClaim[] }
}) {
  const { lang, t, isRtl } = useLang()
  const active = useStore((s) => s.active)
  const normals = useStore((s) => s.normals)
  const virtuals = useStore((s) => s.virtuals)
  const issueCredential = useStore((s) => s.issueCredential)
  const resolve = useResolveActor()

  const [credType, setCredType] = useState<CredentialType>(defaults?.credType ?? 'diploma')
  const [title, setTitle] = useState(defaults?.title ?? '')
  const [claims, setClaims] = useState<CredentialClaim[]>(defaults?.claims ?? [{ label: '', value: '' }])
  const [holderRefs, setHolderRefs] = useState<ActorRef[]>(fixedHolder ? [fixedHolder] : [])
  const [busy, setBusy] = useState(false)

  const options = useMemo<ActorRef[]>(() => {
    const people: ActorRef[] = normals.map((n) => ({ kind: 'normal', normalId: n.id }))
    const vs: ActorRef[] = virtuals
      .filter((v) => v.status === 'active')
      .map((v) => ({ kind: 'virtual', virtualId: v.id }))
    return [...people, ...vs]
  }, [normals, virtuals])

  const holder = fixedHolder ?? holderRefs[0]
  const cleanClaims = claims.map((c) => ({ label: c.label.trim(), value: c.value.trim() })).filter((c) => c.label && c.value)
  const canSubmit = !!holder && !!title.trim() && cleanClaims.length > 0 && !busy

  const submit = async () => {
    if (!holder || !active || busy) return
    setBusy(true)
    try {
      const issuer = active as ActorRef
      const serial = makeSerial('CRD', Date.now() % 1_000_000, credType.slice(0, 3))
      const issuedAt = new Date().toISOString()
      const validity = { open: true }
      const payload = credentialPayload({
        serial, credType, issuer, holder, title: title.trim(), claims: cleanClaims, issuedAt, validity,
      } as any)
      const hash = await hashObject(payload)
      const signature = await simulatedSignature(hash, actorKey(issuer))
      const id = issueCredential(
        { credType, holder, title: title.trim(), claims: cleanClaims, validity, sourceKind: 'manual' },
        { serial, hash, signature, issuedAt },
      )
      if (id) onIssued?.(id)
      onClose()
      setTitle('')
      setClaims([{ label: '', value: '' }])
      setHolderRefs(fixedHolder ? [fixedHolder] : [])
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('issueCredential')}
      footer={
        <Button full onClick={submit} disabled={!canSubmit}>
          {busy ? (isRtl ? 'جارٍ التوقيع…' : 'Signing…') : t('issueNow')}
        </Button>
      }
    >
      <div className="space-y-3">
        {!fixedHolder && (
          <RecipientPicker
            label={t('holder')}
            required
            options={options}
            groups={[]}
            refs={holderRefs.slice(0, 1)}
            groupIds={[]}
            onChangeRefs={(next) => setHolderRefs(next.slice(-1))}
            onChangeGroupIds={() => {}}
            resolveName={(r) => resolve(r).displayName}
            resolveLabel={(r) => `${resolve(r).displayName} · ${resolve(r).address}`}
            placeholder={isRtl ? 'ابحث عن الحامل…' : 'Search holder…'}
            isRtl={isRtl}
          />
        )}
        {fixedHolder && (
          <Field label={t('holder')}>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-700">
              {resolve(fixedHolder).displayName}
            </div>
          </Field>
        )}

        <Field label={t('credentialType')} required>
          <Select value={credType} onChange={(e) => setCredType(e.target.value as CredentialType)}>
            {CRED_TYPES.map((k) => (
              <option key={k} value={k}>{bl(CRED_TYPE_LABELS[k], lang)}</option>
            ))}
          </Select>
        </Field>

        <Field label={t('credentialTitle')} required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isRtl ? 'مثال: بكالوريوس تجارة' : 'e.g. BSc in Commerce'} />
        </Field>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">{t('claims')}</span>
            <button type="button" onClick={() => setClaims((c) => [...c, { label: '', value: '' }])} className="inline-flex items-center gap-1 text-xs font-semibold text-gate-700">
              <Plus size={13} /> {t('addClaim')}
            </button>
          </div>
          <div className="space-y-2">
            {claims.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input value={c.label} onChange={(e) => setClaims((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder={t('claimLabel')} className="flex-1" />
                <Input value={c.value} onChange={(e) => setClaims((arr) => arr.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} placeholder={t('claimValue')} className="flex-1" />
                {claims.length > 1 && (
                  <button type="button" onClick={() => setClaims((arr) => arr.filter((_, j) => j !== i))} className={cx('shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100')}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="pt-1 text-[11px] text-slate-400">{t('signatureSimulated')}</p>
      </div>
    </Sheet>
  )
}
