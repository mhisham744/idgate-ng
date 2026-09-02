import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { virtualAddress } from '@/lib/identity'
import { Button, Card, EmptyState } from '@/ui/primitives'

export function IDGateCode() {
  const navigate = useNavigate()
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const active = useStore((s) => s.active)
  const can = useStore((s) => s.can)
  const virtual = useStore((s) => s.virtual)
  const entity = useStore((s) => s.entity)
  const normals = useStore((s) => s.normals)

  const vc = active?.kind === 'virtual' ? virtual(active.virtualId) : undefined
  const ent = vc ? entity(vc.entityId) : undefined
  const host = vc?.linkedNormalId ? normals.find((n) => n.id === vc.linkedNormalId) : undefined
  const eligible = active?.kind === 'virtual' && can('tool.idgateCode') && !!vc && !!ent

  if (!eligible) {
    return (
      <div className="p-4 space-y-4 pb-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} className={isRtl ? 'rotate-180 me-1.5' : 'me-1.5'} />
          {t('back')}
        </Button>
        <EmptyState
          icon={<ShieldCheck size={28} />}
          title={t('idgateCode')}
          subtitle={L(
            'An IDGate Code is issued to a virtual (position) identity — it is your membership / employee badge. Personal accounts can receive one but cannot issue it. Switch to an active virtual account to view your code.',
            'يُصدر كود IDGate لهوية افتراضية (منصب) كبطاقة عضوية/موظف. الحسابات الشخصية تستقبله فقط ولا تُصدره. بدّل إلى حساب افتراضي نشط لعرض الكود.',
          )}
        />
        <p className="text-center text-xs text-slate-400">{t('canReceiveOnly')}</p>
      </div>
    )
  }

  const address = virtualAddress(vc!, ent!, host)
  const accent = ent!.logoColor

  return (
    <div className="p-4 space-y-4 pb-8">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} className={isRtl ? 'rotate-180 me-1.5' : 'me-1.5'} />
        {t('back')}
      </Button>

      <p className="text-sm text-slate-500">{t('idgateCodeDesc')}</p>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 text-white" style={{ backgroundColor: accent }}>
          <div className="text-xs uppercase tracking-wide opacity-80">{t('idgateCode')}</div>
          <div className="text-lg font-bold">{ent!.commercialName}</div>
          <div className="text-sm opacity-90">{vc!.positionName}</div>
        </div>

        <div className="flex flex-col items-center gap-3 px-5 py-6">
          <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
            <QRCodeSVG value={address} size={180} level="M" />
          </div>
          <div dir="ltr" className="text-center font-mono text-xs text-slate-700 break-all">
            {address}
          </div>
          <div className="text-xs text-slate-400">{t('scanToVerify')}</div>
        </div>

        <div className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
          {host && (
            <div className="flex items-center justify-between px-5 py-2.5">
              <span className="text-slate-500">{t('linkedTo')}</span>
              <span className="font-semibold text-slate-800">{host.fullName}</span>
            </div>
          )}
          {vc!.positionCode && (
            <div className="flex items-center justify-between px-5 py-2.5">
              <span className="text-slate-500">{L('Position code', 'كود المنصب')}</span>
              <span dir="ltr" className="font-mono text-slate-800">{vc!.positionCode}</span>
            </div>
          )}
          {vc!.additionalCodes && vc!.additionalCodes.length > 0 && (
            <div className="flex items-center justify-between px-5 py-2.5">
              <span className="text-slate-500">{L('Additional codes', 'أكواد إضافية')}</span>
              <span dir="ltr" className="font-mono text-slate-800">{vc!.additionalCodes.join(', ')}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
