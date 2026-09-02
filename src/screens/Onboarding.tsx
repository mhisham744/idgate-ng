import { useState } from 'react'
import { ShieldCheck, Globe } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, useI18n } from '@/i18n'
import { personalAddress, colorFor } from '@/lib/identity'
import { Button, Card, Avatar, cx } from '@/ui/primitives'

export function Onboarding() {
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const lang = useI18n((s) => s.lang)
  const toggleLang = useI18n((s) => s.toggle)

  const normals = useStore((s) => s.normals)
  const virtualsFor = useStore((s) => s.virtualsFor)
  const signIn = useStore((s) => s.signIn)

  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center p-5">
      {/* Language toggle (top corner) */}
      <button
        onClick={toggleLang}
        className="absolute top-4 end-4 flex items-center gap-1.5 rounded-full bg-light/10 px-3 py-1.5 text-xs font-medium text-light backdrop-blur transition hover:bg-light/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-light/70 focus-visible:ring-offset-0"
        aria-label="Toggle language"
      >
        <Globe size={14} />
        {lang === 'ar' ? 'EN' : 'ع'}
      </button>

      <div className="w-full max-w-md space-y-5">
        {/* Brand hero */}
        <div className="flex flex-col items-center text-center text-light gap-3 pt-2">
          <div className="w-16 h-16 rounded-3xl bg-light/15 backdrop-blur flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-light" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('appName')}</h1>
            <p className="text-sm text-light/80">{t('subtitle')}</p>
          </div>
        </div>

        {/* Concept card */}
        <Card className="p-5 space-y-4 animate-slide-up">
          <p className="text-sm text-slate-600 leading-relaxed text-start">
            {L(
              'One identity, many roles. Be yourself, or act through an official position granted by a company, ministry, or club — with communication that is always accountable.',
              'هوية واحدة بأدوار متعددة. كن نفسك، أو تصرّف عبر منصب رسمي ممنوح من شركة أو وزارة أو نادٍ — مع تواصل رسمي وموثّق دائمًا.',
            )}
          </p>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-800 text-start">
              {t('chooseIdentity')}
            </h2>

            <div className="space-y-2">
              {normals.map((n) => {
                const roles = virtualsFor(n.id).length
                const active = selectedId === n.id
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSelectedId(n.id)}
                    className={cx(
                      'w-full flex items-center gap-3 rounded-2xl border p-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
                      active
                        ? 'border-gate-500 bg-gate-50 ring-2 ring-gate-500/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                  >
                    <Avatar name={n.fullName} color={colorFor(n.id)} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 truncate">
                        {n.fullName}
                      </div>
                      <div className="font-mono text-[11px] text-gate-700 truncate text-start">
                        <bdi>{personalAddress(n)}</bdi>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {n.city}
                        {' · '}
                        {roles} {L(roles === 1 ? 'role' : 'roles', 'أدوار')}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            full
            disabled={!selectedId}
            onClick={() => selectedId && signIn(selectedId)}
          >
            {t('enterApp')}
          </Button>

          <p className="text-center text-xs text-slate-500">
            {L(
              'Tip: switch language anytime from the globe button.',
              'ملاحظة: يمكنك تبديل اللغة في أي وقت من زر الكرة الأرضية.',
            )}
          </p>
        </Card>
      </div>
    </div>
  )
}
