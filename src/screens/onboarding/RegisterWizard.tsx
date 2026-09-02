import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  FileText,
  Landmark,
  ScanFace,
  Smartphone,
  UserRound,
} from 'lucide-react'
import { useStore } from '@/store'
import type { NewNormalInput } from '@/store'
import { useLang } from '@/i18n'
import type { Country } from '@/types'
import { colorFor } from '@/lib/identity'
import { Avatar, Button, Card, Field, Input, Select, cx } from '@/ui/primitives'
import { VerificationBadge } from '@/components/VerificationBadge'
import { CaptureField, DemoHint, OtpBoxes, Stepper, Working } from './parts'

const COUNTRIES: Country[] = ['Egypt', 'USA', 'France', 'Germany', 'India']
const randomOtp = () => String(Math.floor(100000 + Math.random() * 900000))
// Mask everything but the last two digits. Strip formatting first so grouped
// numbers ("+20 100 123 4567") don't leak a digit before each space.
const maskMobile = (m: string) => {
  const d = m.replace(/\D/g, '')
  return d.length <= 2 ? d : '•'.repeat(d.length - 2) + d.slice(-2)
}

interface Claim {
  firstName: string
  surname: string
  gender: 'Male' | 'Female'
  dateOfBirth: string
  nationality: Country
  city: string
  nationalId: string
  mobile: string
  email: string
}

const EMPTY: Claim = {
  firstName: '',
  surname: '',
  gender: 'Male',
  dateOfBirth: '',
  nationality: 'Egypt',
  city: '',
  nationalId: '',
  mobile: '',
  email: '',
}

export function RegisterWizard({ onBack }: { onBack: () => void }) {
  const { isRtl, t } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const registerNormal = useStore((s) => s.registerNormal)

  const [step, setStep] = useState(0) // 0..5
  const [form, setForm] = useState<Claim>(EMPTY)
  const set = <K extends keyof Claim>(k: K, v: Claim[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    // Editing a claim field invalidates any proof that was tied to its old
    // value, so a changed identity can't ride in on a stale "verified" flag.
    if (k === 'mobile') {
      setMobileVerified(false)
      setMobileOtpSent(null)
      setMobileOtp('')
      setMobileErr(false)
    } else if (k === 'email') {
      setEmailState('idle')
    } else if (k === 'firstName' || k === 'surname' || k === 'nationalId') {
      setOcr('idle')
      setMatch('idle')
      setRegistry('idle')
    }
  }

  // contact verification
  const [mobileOtpSent, setMobileOtpSent] = useState<string | null>(null)
  const [mobileOtp, setMobileOtp] = useState('')
  const [mobileErr, setMobileErr] = useState(false)
  const [mobileVerified, setMobileVerified] = useState(false)
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'verified'>('idle')

  // documents
  const [front, setFront] = useState(false)
  const [back, setBack] = useState(false)
  const [ocr, setOcr] = useState<'idle' | 'running' | 'done'>('idle')

  // liveness
  const [selfie, setSelfie] = useState(false)
  const [match, setMatch] = useState<'idle' | 'running' | 'done'>('idle')
  const [matchScore, setMatchScore] = useState(0)

  // registry
  const [registry, setRegistry] = useState<'idle' | 'running' | 'done'>('idle')

  const nidValid = /^\d{14}$/.test(form.nationalId.trim())
  const claimValid =
    form.firstName.trim() && form.surname.trim() && form.city.trim() && form.mobile.trim() && nidValid
  const emailOk = !form.email.trim() || emailState === 'verified'

  const canNext =
    step === 0 ? !!claimValid
    : step === 1 ? mobileVerified && emailOk
    : step === 2 ? front && back && ocr === 'done'
    : step === 3 ? selfie && match === 'done'
    : step === 4 ? registry === 'done'
    : true

  // Registry check runs automatically on entering step 4. Depend on `step`
  // ONLY: if `registry` were a dep, flipping it to 'running' below would run
  // this effect's cleanup (clearing the timer) before it could ever fire.
  useEffect(() => {
    if (step !== 4 || registry !== 'idle') return
    setRegistry('running')
    const id = window.setTimeout(() => setRegistry('done'), 2200)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  const sendMobileOtp = () => {
    setMobileOtp('')
    setMobileErr(false)
    setMobileOtpSent(randomOtp())
  }
  const submitMobileOtp = () => {
    if (mobileOtp === mobileOtpSent) setMobileVerified(true)
    else setMobileErr(true)
  }
  const verifyEmail = () => {
    setEmailState('sending')
    window.setTimeout(() => setEmailState('verified'), 1400)
  }
  const runOcr = () => {
    setOcr('running')
    window.setTimeout(() => setOcr('done'), 1800)
  }
  const runMatch = () => {
    setMatch('running')
    window.setTimeout(() => {
      setMatchScore(96 + Math.floor(Math.random() * 4))
      setMatch('done')
    }, 2400)
  }

  const finish = () => {
    const input: NewNormalInput = {
      firstName: form.firstName,
      surname: form.surname,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || undefined,
      nationality: form.nationality,
      city: form.city,
      nationalId: form.nationalId,
      mobile: form.mobile,
      email: form.email || undefined,
      verification: {
        level: 'verified',
        contact: true,
        document: true,
        liveness: true,
        registry: true,
        verifiedAt: new Date().toISOString(),
      },
    }
    registerNormal(input) // creates account + signs in → App swaps to the Shell
  }

  const TITLES: { icon: typeof UserRound; en: string; ar: string; sub: [string, string] }[] = [
    { icon: UserRound, en: 'Your details', ar: 'بياناتك', sub: ['We start with who you claim to be.', 'نبدأ بمن تُعرّف نفسك به.'] },
    { icon: Smartphone, en: 'Verify contact', ar: 'توثيق التواصل', sub: ['Prove the mobile and email are yours.', 'أثبت أن الجوال والبريد لك.'] },
    { icon: FileText, en: 'National ID', ar: 'بطاقة الرقم القومي', sub: ['Capture both sides of your ID card.', 'صوّر وجهي بطاقتك.'] },
    { icon: ScanFace, en: 'Liveness check', ar: 'فحص الحيوية', sub: ['A quick selfie to match your ID photo.', 'صورة ذاتية سريعة لمطابقة صورة بطاقتك.'] },
    { icon: Landmark, en: 'Registry check', ar: 'التحقق من السجل', sub: ['Confirming against the national registry.', 'التأكيد مقابل السجل الوطني.'] },
    { icon: BadgeCheck, en: 'Verified', ar: 'تم التوثيق', sub: ['Your IDGate identity is ready.', 'هويتك في IDGate جاهزة.'] },
  ]
  const head = TITLES[step]
  const HeadIcon = head.icon

  // ── Success ─────────────────────────────────────────────────────────────────
  if (step === 5) {
    return (
      <Card className="animate-slide-up space-y-5 p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600">
          <BadgeCheck size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-800">{L('Identity verified', 'تم توثيق الهوية')}</h2>
          <p className="text-sm text-slate-500">
            {L('Your personal IDGate account is ready.', 'حسابك الشخصي في IDGate جاهز.')}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-start">
          <Avatar name={`${form.firstName} ${form.surname}`} color={colorFor(`${form.firstName} ${form.surname}`.trim())} size={44} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-800">
              {form.firstName} {form.surname}
            </div>
            <div className="truncate font-mono text-[11px] text-gate-700" dir="ltr">
              {form.firstName}.{form.surname}
            </div>
          </div>
          <VerificationBadge level="verified" />
        </div>
        <Button full size="lg" onClick={finish}>
          {t('enterApp')}
        </Button>
      </Card>
    )
  }

  return (
    <Card className="animate-slide-up space-y-4 p-5">
      <div className="flex items-center gap-2">
        <button
          onClick={() => (step === 0 ? onBack() : setStep((s) => s - 1))}
          className="rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
          aria-label={isRtl ? 'رجوع' : 'Back'}
        >
          <ArrowLeft size={18} className={cx(isRtl && 'rotate-180')} />
        </button>
        <span className="text-xs font-medium text-slate-400">
          {L('Step', 'خطوة')} {step + 1} / 5
        </span>
        <div className="ms-auto">
          <Stepper total={5} current={step} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gate-50 text-gate-600">
          <HeadIcon size={22} />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800">{isRtl ? head.ar : head.en}</h2>
          <p className="text-xs text-slate-500">{isRtl ? head.sub[1] : head.sub[0]}</p>
        </div>
      </div>

      {/* ── Step bodies ─────────────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={L('First name', 'الاسم الأول')} required>
              <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </Field>
            <Field label={L('Surname', 'اسم العائلة')} required>
              <Input value={form.surname} onChange={(e) => set('surname', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L('Gender', 'النوع')}>
              <Select value={form.gender} onChange={(e) => set('gender', e.target.value as Claim['gender'])}>
                <option value="Male">{L('Male', 'ذكر')}</option>
                <option value="Female">{L('Female', 'أنثى')}</option>
              </Select>
            </Field>
            <Field label={L('Date of birth', 'تاريخ الميلاد')}>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L('Nationality', 'الجنسية')}>
              <Select value={form.nationality} onChange={(e) => set('nationality', e.target.value as Country)}>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label={L('City', 'المدينة')} required>
              <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
          </div>
          <Field label={L('National ID', 'الرقم القومي')} required hint={L('14 digits', '14 رقمًا')}>
            <Input
              inputMode="numeric"
              dir="ltr"
              value={form.nationalId}
              onChange={(e) => set('nationalId', e.target.value.replace(/\D/g, '').slice(0, 14))}
              placeholder="__ ____ __ ______"
              className={cx(form.nationalId && !nidValid && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100')}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={L('Mobile', 'الجوال')} required>
              <Input inputMode="tel" dir="ltr" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} placeholder="+20 1__ ___ ____" />
            </Field>
            <Field label={L('Email', 'البريد الإلكتروني')} hint={t('optional')}>
              <Input type="email" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {/* mobile */}
          <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Smartphone size={15} className="text-gate-600" /> {L('Mobile', 'الجوال')}
                <span dir="ltr" className="font-mono text-xs text-slate-500">{maskMobile(form.mobile)}</span>
              </span>
              {mobileVerified && <VerificationBadge level="verified" />}
            </div>
            {!mobileVerified ? (
              !mobileOtpSent ? (
                <Button full size="sm" variant="secondary" onClick={sendMobileOtp}>
                  {L('Send code', 'إرسال الرمز')}
                </Button>
              ) : (
                <div className="space-y-2">
                  <DemoHint>
                    {L('Demo code:', 'رمز تجريبي:')} <span dir="ltr" className="font-mono font-bold">{mobileOtpSent}</span>
                  </DemoHint>
                  <OtpBoxes value={mobileOtp} onChange={(v) => { setMobileOtp(v); setMobileErr(false) }} />
                  {mobileErr && <p className="text-center text-xs text-rose-500">{L('Incorrect code.', 'رمز غير صحيح.')}</p>}
                  <div className="flex gap-2">
                    <Button full size="sm" variant="subtle" onClick={sendMobileOtp}>{L('Resend', 'إعادة إرسال')}</Button>
                    <Button full size="sm" disabled={mobileOtp.length < 6} onClick={submitMobileOtp}>{L('Verify', 'تحقّق')}</Button>
                  </div>
                </div>
              )
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600"><Check size={14} /> {L('Mobile verified', 'تم توثيق الجوال')}</p>
            )}
          </div>

          {/* email (optional) */}
          {form.email.trim() && (
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  {L('Email', 'البريد')} <span dir="ltr" className="font-mono text-xs text-slate-500">{form.email}</span>
                </span>
                {emailState === 'verified' && <VerificationBadge level="verified" />}
              </div>
              {emailState === 'idle' && (
                <Button full size="sm" variant="secondary" onClick={verifyEmail}>{L('Send verification link', 'إرسال رابط التوثيق')}</Button>
              )}
              {emailState === 'sending' && <Working label={L('Waiting for confirmation…', 'بانتظار التأكيد…')} />}
              {emailState === 'verified' && (
                <p className="flex items-center gap-1.5 text-xs text-emerald-600"><Check size={14} /> {L('Email verified', 'تم توثيق البريد')}</p>
              )}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <CaptureField label={L('Front', 'الوجه الأمامي')} facing="environment" captured={front} onCapture={(u) => { setFront(!!u); setOcr('idle') }} />
            <CaptureField label={L('Back', 'الوجه الخلفي')} facing="environment" captured={back} onCapture={(u) => { setBack(!!u); setOcr('idle') }} />
          </div>
          {front && back && ocr === 'idle' && (
            <Button full variant="secondary" onClick={runOcr}>{L('Scan document', 'مسح البطاقة')}</Button>
          )}
          {ocr === 'running' && <Working label={L('Reading your ID…', 'جارٍ قراءة بطاقتك…')} />}
          {ocr === 'done' && (
            <div className="space-y-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <p className="flex items-center gap-1.5 font-medium text-emerald-700"><Check size={15} /> {L('Extracted & matched', 'تم الاستخراج والمطابقة')}</p>
              <div className="flex justify-between text-xs text-emerald-700/70"><span>{L('Name', 'الاسم')}</span><span className="font-medium text-emerald-900">{form.firstName} {form.surname}</span></div>
              <div className="flex justify-between text-xs text-emerald-700/70"><span>{L('National ID', 'الرقم القومي')}</span><span dir="ltr" className="font-mono text-emerald-900">{form.nationalId}</span></div>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <CaptureField label={L('Take a selfie', 'التقط صورة ذاتية')} facing="user" captured={selfie} onCapture={(u) => { setSelfie(!!u); setMatch('idle') }} />
          {selfie && match === 'idle' && (
            <>
              <DemoHint>{L('When ready, blink and slowly turn your head.', 'عند الاستعداد، اطرف بعينيك وأدر رأسك ببطء.')}</DemoHint>
              <Button full variant="secondary" onClick={runMatch}>{L('Start liveness check', 'ابدأ فحص الحيوية')}</Button>
            </>
          )}
          {match === 'running' && <Working label={L('Checking liveness & matching face…', 'فحص الحيوية ومطابقة الوجه…')} />}
          {match === 'done' && (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-emerald-700"><Check size={15} /> {L('Live person · face matched', 'شخص حيّ · مطابقة الوجه')}</span>
              <span className="font-mono text-emerald-700">{matchScore}%</span>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="space-y-3 py-2">
          {registry === 'done' ? (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              <Check size={16} /> {L('Verified against the national registry', 'تم التحقق مقابل السجل الوطني')}
            </div>
          ) : (
            <Working label={L('Checking national registry…', 'التحقق من السجل الوطني…')} />
          )}
          <p className="text-center text-[11px] text-slate-400">
            {L('Simulated for the demo — no real registry is contacted.', 'محاكاة للعرض — لا يتم الاتصال بسجل حقيقي.')}
          </p>
        </div>
      )}

      {step < 5 && (
        <Button full size="lg" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
          {step === 4 ? L('Finish', 'إنهاء') : L('Continue', 'متابعة')}
        </Button>
      )}
    </Card>
  )
}
