import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Fingerprint, KeyRound, ShieldCheck, Smartphone } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { personalAddress } from '@/lib/identity'
import { Avatar, Button, Card, cx } from '@/ui/primitives'
import { VerificationBadge, levelOf } from '@/components/VerificationBadge'
import { DemoHint, OtpBoxes, Working } from './parts'

type Step = 'choose' | 'auth'
type Method = 'passkey' | 'otp'

const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000))
const maskMobile = (m: string) => {
  const d = m.replace(/\D/g, '')
  return d.length <= 2 ? d : '•'.repeat(d.length - 2) + d.slice(-2)
}

export function SignIn({ onBack }: { onBack: () => void }) {
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const normals = useStore((s) => s.normals)
  const virtualsFor = useStore((s) => s.virtualsFor)
  const signIn = useStore((s) => s.signIn)

  const [step, setStep] = useState<Step>('choose')
  const [chosenId, setChosenId] = useState<string | null>(null)
  const chosen = normals.find((n) => n.id === chosenId)

  const [method, setMethod] = useState<Method>('passkey')
  const [verifying, setVerifying] = useState(false)
  const [otpSent, setOtpSent] = useState<string | null>(null)
  const [otp, setOtp] = useState('')
  const [otpError, setOtpError] = useState(false)

  // Track the pending "authenticating…" timer so navigating away (Back /
  // unmount) can't complete a sign-in the user abandoned.
  const timer = useRef<number | undefined>(undefined)
  const cancelPending = () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current)
    timer.current = undefined
    setVerifying(false)
  }
  useEffect(() => () => { if (timer.current !== undefined) window.clearTimeout(timer.current) }, [])

  const pick = (id: string) => {
    cancelPending()
    setChosenId(id)
    setStep('auth')
    setMethod('passkey')
    setOtpSent(null)
    setOtp('')
    setOtpError(false)
  }

  const runPasskey = () => {
    setVerifying(true)
    timer.current = window.setTimeout(() => chosenId && signIn(chosenId), 1300)
  }

  const sendOtp = () => {
    setOtp('')
    setOtpError(false)
    setOtpSent(randomOtp())
  }

  const submitOtp = () => {
    if (otp === otpSent) {
      setVerifying(true)
      timer.current = window.setTimeout(() => chosenId && signIn(chosenId), 700)
    } else {
      setOtpError(true)
    }
  }

  const backToChoose = () => {
    cancelPending()
    setStep('choose')
  }

  // ── Step 1: choose which personal account ──────────────────────────────────
  if (step === 'choose') {
    return (
      <Card className="animate-slide-up space-y-4 p-5">
        <BackRow onBack={onBack} label={L('Sign in', 'تسجيل الدخول')} />
        <p className="text-start text-sm leading-relaxed text-slate-600">
          {L(
            'Choose your personal account, then confirm it is you.',
            'اختر حسابك الشخصي، ثم أكّد هويتك.',
          )}
        </p>
        <div className="space-y-2">
          {normals.map((n) => {
            const roles = virtualsFor(n.id).length
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => pick(n.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-start transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <Avatar name={n.fullName} color={n.avatarColor} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-semibold text-slate-900">{n.fullName}</span>
                    <VerificationBadge level={levelOf(n.verification)} variant="icon" />
                  </div>
                  <div className="truncate text-start font-mono text-[11px] text-gate-700">
                    <bdi>{personalAddress(n)}</bdi>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {n.city} · {roles} {L(roles === 1 ? 'role' : 'roles', 'أدوار')}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
        <p className="text-center text-[11px] text-slate-400">
          {L(
            'Demo: these are pre-verified sample identities. Create a new account to try full verification.',
            'تجريبي: هذه هويات نموذجية موثّقة مسبقًا. أنشئ حسابًا جديدًا لتجربة التوثيق الكامل.',
          )}
        </p>
      </Card>
    )
  }

  // ── Step 2: authenticate the chosen account ────────────────────────────────
  return (
    <Card className="animate-slide-up space-y-4 p-5">
      <BackRow onBack={backToChoose} label={L('Confirm it is you', 'أكّد هويتك')} />

      {chosen && (
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <Avatar name={chosen.fullName} color={chosen.avatarColor} size={40} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">{chosen.fullName}</div>
            <div className="truncate font-mono text-[11px] text-gate-700" dir="ltr">{personalAddress(chosen)}</div>
          </div>
          <VerificationBadge level={levelOf(chosen?.verification)} />
        </div>
      )}

      {verifying ? (
        <Working label={L('Verifying…', 'جارٍ التحقق…')} />
      ) : method === 'passkey' ? (
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gate-50 text-gate-600">
              <Fingerprint size={30} />
            </div>
            <p className="text-sm font-medium text-slate-700">{L('Use your device passkey', 'استخدم مفتاح جهازك')}</p>
            <p className="max-w-[16rem] text-xs text-slate-500">
              {L(
                'Confirm with the fingerprint, face, or screen lock on this device.',
                'أكّد ببصمتك أو وجهك أو قفل الشاشة على هذا الجهاز.',
              )}
            </p>
          </div>
          <Button full size="lg" onClick={runPasskey}>
            <ShieldCheck size={18} /> {L('Authenticate', 'تحقّق')}
          </Button>
          <button
            type="button"
            onClick={() => { setMethod('otp'); sendOtp() }}
            className="flex w-full items-center justify-center gap-1.5 text-xs font-medium text-gate-700 hover:underline"
          >
            <KeyRound size={13} /> {L('Use a one-time code instead', 'استخدم رمزًا لمرة واحدة بدلًا من ذلك')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Smartphone size={16} className="text-gate-600" />
            {L('Code sent to', 'أُرسل الرمز إلى')}{' '}
            <span dir="ltr" className="font-mono text-slate-800">{chosen ? maskMobile(chosen.contacts.mobile) : ''}</span>
          </div>
          {otpSent && (
            <DemoHint>
              {L('Demo code:', 'رمز تجريبي:')} <span dir="ltr" className="font-mono font-bold">{otpSent}</span>
            </DemoHint>
          )}
          <OtpBoxes value={otp} onChange={(v) => { setOtp(v); setOtpError(false) }} />
          {otpError && (
            <p className="text-center text-xs text-rose-500">{L('Incorrect code. Try again.', 'رمز غير صحيح. حاول مرة أخرى.')}</p>
          )}
          <Button full size="lg" disabled={otp.length < 6} onClick={submitOtp}>
            {t('enterApp')}
          </Button>
          <button type="button" onClick={sendOtp} className="w-full text-center text-xs font-medium text-gate-700 hover:underline">
            {L('Resend code', 'إعادة إرسال الرمز')}
          </button>
        </div>
      )}
    </Card>
  )
}

function BackRow({ onBack, label }: { onBack: () => void; label: string }) {
  const { isRtl } = useLang()
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onBack}
        className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
        aria-label={isRtl ? 'رجوع' : 'Back'}
      >
        <ArrowLeft size={18} className={cx(isRtl && 'rotate-180')} />
      </button>
      <h2 className="text-base font-bold text-slate-800">{label}</h2>
    </div>
  )
}
