import { ShieldCheck, Download, Link2 } from 'lucide-react'
import type { Receipt } from '@/types'
import { useLang } from '@/i18n'
import { formatDate } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'

/** Renders a tamper-evident signed receipt with a JSON export. */
export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  const { lang, t } = useLang()
  const resolve = useResolveActor()

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${receipt.serial}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10000)
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
          <ShieldCheck size={14} /> {t('signedReceipt')}
        </span>
        <button type="button" onClick={exportJson} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-medium text-emerald-700 hover:bg-emerald-100">
          <Download size={12} /> {t('exportReceipt')}
        </button>
      </div>
      <div className="space-y-1 text-slate-600">
        <div className="font-medium text-slate-800">{receipt.statement}</div>
        <div className="flex justify-between gap-2"><span className="text-slate-500">{t('signedBy')}</span><span className="font-medium">{resolve(receipt.signedBy).displayName}</span></div>
        <div className="flex justify-between gap-2"><span className="text-slate-500">{t('signedAt')}</span><span>{formatDate(receipt.signedAt, lang)}</span></div>
        <div className="flex justify-between gap-2"><span className="text-slate-500">{t('serial')}</span><span dir="ltr" className="font-mono">{receipt.serial}</span></div>
        <div className="flex items-center gap-1 pt-1 text-[10px] text-slate-400">
          <Link2 size={11} />
          <span dir="ltr" className="truncate font-mono">{receipt.prevHash.slice(0, 10)}… → {receipt.hash.slice(0, 10)}…</span>
        </div>
      </div>
    </div>
  )
}
