import { useState } from 'react'
import { ShieldCheck, Globe, LogIn, UserPlus } from 'lucide-react'
import { useLang, useI18n } from '@/i18n'
import { Button, Card } from '@/ui/primitives'
import { SignIn } from '@/screens/onboarding/SignIn'
import { RegisterWizard } from '@/screens/onboarding/RegisterWizard'

type Mode = 'landing' | 'signin' | 'register'

export function Onboarding() {
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const lang = useI18n((s) => s.lang)
  const toggleLang = useI18n((s) => s.toggle)

  const [mode, setMode] = useState<Mode>('landing')

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
        <div className="flex flex-col items-center gap-3 pt-2 text-center text-light">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-light/15 backdrop-blur">
            <ShieldCheck className="h-8 w-8 text-light" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('appName')}</h1>
            <p className="text-sm text-light/80">{t('subtitle')}</p>
          </div>
        </div>

        {mode === 'landing' && (
          <Card className="animate-slide-up space-y-4 p-5">
            <p className="text-start text-sm leading-relaxed text-slate-600">
              {L(
                'One identity, many roles. Be yourself, or act through an official position granted by a company, ministry, or club — with communication that is always accountable.',
                'هوية واحدة بأدوار متعددة. كن نفسك، أو تصرّف عبر منصب رسمي ممنوح من شركة أو وزارة أو نادٍ — مع تواصل رسمي وموثّق دائمًا.',
              )}
            </p>

            <div className="space-y-2">
              <Button full size="lg" onClick={() => setMode('signin')}>
                <LogIn size={18} /> {L('Sign in', 'تسجيل الدخول')}
              </Button>
              <Button full size="lg" variant="secondary" onClick={() => setMode('register')}>
                <UserPlus size={18} /> {L('Create a new IDGate account', 'إنشاء حساب IDGate جديد')}
              </Button>
            </div>

            <p className="text-center text-xs text-slate-500">
              {L(
                'New accounts are verified with ID, liveness, and a registry check.',
                'الحسابات الجديدة تُوثَّق بالبطاقة والحيوية والتحقق من السجل.',
              )}
            </p>
          </Card>
        )}

        {mode === 'signin' && <SignIn onBack={() => setMode('landing')} />}
        {mode === 'register' && <RegisterWizard onBack={() => setMode('landing')} />}
      </div>
    </div>
  )
}
