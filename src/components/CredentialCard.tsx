import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Wallet, BadgeCheck, ShieldOff, Clock } from 'lucide-react'
import type { Credential } from '@/types'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { CRED_TYPE_LABELS, CRED_STATUS_LABELS } from '@/data/reference'
import { useResolveActor } from '@/components/identity'
import { addToWallet, walletEnabled } from '@/lib/wallet'
import { Badge, Button, Card, cx } from '@/ui/primitives'

/** Compact token encoded in the credential QR (looked up & re-hashed by Verify). */
export function credentialToken(c: Pick<Credential, 'serial' | 'hash' | 'issuer'>): string {
  const issuerKey = c.issuer.kind === 'normal' ? `n:${c.issuer.normalId}` : `v:${c.issuer.virtualId}`
  return `IDGATE-CRED:${c.serial}|${c.hash}|${issuerKey}`
}

const STATUS_TONE = { active: 'green', revoked: 'red', expired: 'amber' } as const

export function CredentialCard({ cred, onRevoke }: { cred: Credential; onRevoke?: () => void }) {
  const { lang, t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const resolve = useResolveActor()
  const issuer = resolve(cred.issuer)
  const holder = resolve(cred.holder)
  const isVerifiedIssuer = useStore((s) => s.isVerifiedIssuer)
  const [showQr, setShowQr] = useState(false)
  const [adding, setAdding] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const StatusIcon = cred.status === 'active' ? BadgeCheck : cred.status === 'revoked' ? ShieldOff : Clock

  const onWallet = async () => {
    setErr(null)
    setAdding(true)
    try {
      await addToWallet({
        address: credentialToken(cred),
        name: holder.displayName,
        position: bl(CRED_TYPE_LABELS[cred.credType], lang),
        org: issuer.displayName,
        code: cred.serial,
        color: issuer.color,
        serial: `idgate-cred-${cred.id}`,
      })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {bl(CRED_TYPE_LABELS[cred.credType], lang)}
          </div>
          <h4 className="truncate text-sm font-bold text-slate-800">{cred.title}</h4>
        </div>
        <Badge tone={STATUS_TONE[cred.status]} className="shrink-0">
          <StatusIcon size={11} />
          {bl(CRED_STATUS_LABELS[cred.status], lang)}
        </Badge>
      </div>

      <div className="space-y-2 px-4 py-3">
        {cred.claims.map((c, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 text-sm">
            <span className="shrink-0 text-xs text-slate-500">{c.label}</span>
            <span className="truncate text-end font-medium text-slate-800">{c.value}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 border-t border-slate-100 px-4 py-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">{t('issuer')}</span>
          <span className="inline-flex items-center gap-1 truncate font-medium text-slate-700">
            {issuer.displayName}
            {isVerifiedIssuer(cred.issuer) && <BadgeCheck size={13} className="shrink-0 text-emerald-600" />}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">{t('serial')}</span>
          <span dir="ltr" className="font-mono text-slate-700">{cred.serial}</span>
        </div>
      </div>

      {showQr && (
        <div className="flex flex-col items-center gap-2 border-t border-slate-100 bg-slate-50/60 py-5">
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <QRCodeSVG value={credentialToken(cred)} size={150} level="M" />
          </div>
          <div className="text-[11px] text-slate-400">{t('scanToVerify') || L('Scan to verify', 'امسح للتحقق')}</div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
        <Button variant="secondary" size="sm" onClick={() => setShowQr((v) => !v)}>
          {t('presentQr')}
        </Button>
        {walletEnabled && cred.status === 'active' && (
          <button
            type="button"
            onClick={onWallet}
            disabled={adding}
            className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white transition active:scale-[0.97] disabled:opacity-50"
          >
            <Wallet size={14} />
            {adding ? L('Preparing…', 'جارٍ التحضير…') : L('Apple Wallet', 'Apple Wallet')}
          </button>
        )}
        {onRevoke && cred.status === 'active' && (
          <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50" onClick={onRevoke}>
            {t('revoke')}
          </Button>
        )}
      </div>
      {err && <p className="px-4 pb-3 text-xs text-rose-500">{err}</p>}
    </Card>
  )
}
