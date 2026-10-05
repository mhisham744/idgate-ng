import { useMemo, useState } from 'react'
import { ArrowLeft, ShieldCheck, ShieldAlert, ShieldX, BadgeCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { CRED_TYPE_LABELS } from '@/data/reference'
import { useResolveActor } from '@/components/identity'
import { credentialPayload, hashObject } from '@/lib/crypto'
import { Button, Card, Field, Input, Select, cx } from '@/ui/primitives'

type Result =
  | { kind: 'verified'; serial: string }
  | { kind: 'tampered' }
  | { kind: 'revoked'; serial: string }
  | { kind: 'notfound' }

/** Parse a credential token `IDGATE-CRED:<serial>|<hash>|<issuerKey>` → its serial. */
function parseToken(raw: string): string | null {
  const s = raw.trim()
  const body = s.startsWith('IDGATE-CRED:') ? s.slice('IDGATE-CRED:'.length) : s
  const serial = body.split('|')[0]?.trim()
  return serial || null
}

export function VerifyCredential() {
  const navigate = useNavigate()
  const { lang, t, isRtl } = useLang()
  const credentials = useStore((s) => s.credentials)
  const resolve = useResolveActor()
  const isVerifiedIssuer = useStore((s) => s.isVerifiedIssuer)

  const [token, setToken] = useState('')
  const [picked, setPicked] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)

  const matched = useMemo(
    () => (result && 'serial' in result ? credentials.find((c) => c.serial === result.serial) : undefined),
    [result, credentials],
  )

  const verify = async () => {
    setBusy(true)
    setResult(null)
    try {
      const serial = parseToken(picked || token)
      const cred = serial ? credentials.find((c) => c.serial === serial) : undefined
      if (!cred) {
        setResult({ kind: 'notfound' })
        return
      }
      // Recompute the hash from the stored content; compare to the signed hash.
      const recomputed = await hashObject(credentialPayload(cred))
      if (recomputed !== cred.hash) {
        setResult({ kind: 'tampered' })
      } else if (cred.status === 'revoked') {
        setResult({ kind: 'revoked', serial: cred.serial })
      } else {
        setResult({ kind: 'verified', serial: cred.serial })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 p-4 pb-10">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} className={isRtl ? 'rotate-180 me-1.5' : 'me-1.5'} />
        {t('back')}
      </Button>

      <div>
        <h1 className="text-xl font-bold text-slate-800">{t('verifyWithIdgate')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('verifyDesc')}</p>
      </div>

      <Card className="space-y-3 p-4">
        <Field label={t('credentialToken')}>
          <Input value={token} onChange={(e) => { setToken(e.target.value); setPicked('') }} placeholder="IDGATE-CRED:…" dir="ltr" />
        </Field>
        <Field label={t('pickCredential')}>
          <Select value={picked} onChange={(e) => { setPicked(e.target.value); setToken('') }}>
            <option value="">—</option>
            {credentials.map((c) => (
              <option key={c.id} value={c.serial}>{c.serial} · {c.title}</option>
            ))}
          </Select>
        </Field>
        <Button full onClick={verify} disabled={busy || (!token.trim() && !picked)}>
          {busy ? (isRtl ? 'جارٍ التحقق…' : 'Verifying…') : t('verifyNow')}
        </Button>
      </Card>

      {result && (
        <Card
          className={cx(
            'p-5',
            result.kind === 'verified' && 'border-emerald-200 bg-emerald-50/50',
            result.kind === 'revoked' && 'border-amber-200 bg-amber-50/50',
            (result.kind === 'tampered' || result.kind === 'notfound') && 'border-rose-200 bg-rose-50/50',
          )}
        >
          <div className="flex items-center gap-3">
            {result.kind === 'verified' && <ShieldCheck className="text-emerald-600" size={28} />}
            {result.kind === 'revoked' && <ShieldAlert className="text-amber-600" size={28} />}
            {(result.kind === 'tampered' || result.kind === 'notfound') && <ShieldX className="text-rose-600" size={28} />}
            <div>
              <div className="text-base font-bold text-slate-800">
                {result.kind === 'verified' && t('verified')}
                {result.kind === 'revoked' && t('revoked')}
                {result.kind === 'tampered' && t('tampered')}
                {result.kind === 'notfound' && t('notFound')}
              </div>
              <div className="text-xs text-slate-500">
                {result.kind === 'verified' && t('verifiedOk')}
                {result.kind === 'revoked' && t('revokedWarn')}
                {result.kind === 'tampered' && t('tamperedMsg')}
              </div>
            </div>
          </div>

          {matched && (
            <div className="mt-4 space-y-1.5 border-t border-slate-200/70 pt-4 text-sm">
              <div className="font-semibold text-slate-800">{matched.title}</div>
              <div className="text-xs text-slate-500">{bl(CRED_TYPE_LABELS[matched.credType], lang)}</div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500">{t('issuer')}</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700">
                  {resolve(matched.issuer).displayName}
                  {isVerifiedIssuer(matched.issuer) && <BadgeCheck size={13} className="text-emerald-600" />}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{t('holder')}</span>
                <span className="text-sm font-medium text-slate-700">{resolve(matched.holder).displayName}</span>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
