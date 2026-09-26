import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { personalAddress, formatDate } from '@/lib/identity'
import { VerificationBadge, levelOf } from '@/components/VerificationBadge'
import {
  Avatar,
  Button,
  Card,
  Field,
  Input,
  Select,
  Textarea,
  Toggle,
  EmptyState,
  cx,
} from '@/ui/primitives'
import type { AttachmentMeta, Country, Language, NormalCharacter, PrivacyLevel } from '@/types'
import { ChevronLeft, Pencil, X, User, Phone, GraduationCap, Briefcase, ShieldCheck, Paperclip, FileText } from 'lucide-react'

type Fluency = 'Basic' | 'Average' | 'Fluent'
const COUNTRIES: Country[] = ['Egypt', 'USA', 'France', 'Germany', 'India']
const LANGUAGES: Language[] = ['Arabic', 'English', 'French']
const FLUENCY: Fluency[] = ['Basic', 'Average', 'Fluent']

type Form = {
  fullName: string
  gender: '' | 'Male' | 'Female'
  dateOfBirth: string
  nat1: '' | Country
  nat2: '' | Country
  nat3: '' | Country
  residenceCountry: '' | Country
  nationalId: string
  passport: string
  motherTongue: '' | Language
  motherFluency: '' | Fluency
  lang1: '' | Language
  lang1Fluency: '' | Fluency
  lang2: '' | Language
  lang2Fluency: '' | Fluency
  city: string
  address1: string
  mobile: string
  email: string
  landline: string
  linkedIn: string
  facebook: string
  whatsApp: string
  school: string
  university: string
  postgraduate: string
  phd: string
  title: string
  profession: string
  industry: string
  history: string
  cv?: AttachmentMeta
  vacancyNotification: boolean
  privacy: NormalCharacter['privacy']
}

function toForm(n: NormalCharacter): Form {
  const extras = (n.languages ?? []).filter((l) => l.language !== n.motherTongue)
  const motherLevel = (n.languages ?? []).find((l) => l.language === n.motherTongue)?.level
  return {
    fullName: n.fullName,
    gender: n.gender,
    dateOfBirth: n.dateOfBirth ? n.dateOfBirth.slice(0, 10) : '',
    nat1: n.nationalities[0] ?? '',
    nat2: n.nationalities[1] ?? '',
    nat3: n.nationalities[2] ?? '',
    residenceCountry: n.residenceCountry ?? '',
    nationalId: n.nationalId ?? '',
    passport: n.passports?.[0] ?? '',
    motherTongue: n.motherTongue ?? '',
    motherFluency: (motherLevel as Fluency) ?? 'Fluent',
    lang1: (extras[0]?.language as Language) ?? '',
    lang1Fluency: (extras[0]?.level as Fluency) ?? '',
    lang2: (extras[1]?.language as Language) ?? '',
    lang2Fluency: (extras[1]?.level as Fluency) ?? '',
    city: n.city,
    address1: n.address1 ?? '',
    mobile: n.contacts.mobile,
    email: n.contacts.email ?? '',
    landline: n.contacts.landline ?? '',
    linkedIn: n.contacts.linkedIn ?? '',
    facebook: n.contacts.facebook ?? '',
    whatsApp: n.contacts.whatsApp ?? '',
    school: n.education?.school ?? '',
    university: n.education?.university ?? '',
    postgraduate: n.education?.postgraduate ?? '',
    phd: n.education?.phd ?? '',
    title: n.career?.title ?? '',
    profession: n.career?.profession ?? '',
    industry: n.career?.industry ?? '',
    history: n.career?.history ?? '',
    cv: n.career?.cv,
    vacancyNotification: n.vacancyNotification ?? false,
    privacy: n.privacy,
  }
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

/** Natural-person master data — full editable form, persisted to the store. */
export function PersonalMasterData() {
  const nav = useNavigate()
  const { lang, t, isRtl } = useLang()
  const currentNormal = useStore((s) => s.currentNormal)
  const updateNormal = useStore((s) => s.updateNormal)
  const virtualsFor = useStore((s) => s.virtualsFor)
  const entity = useStore((s) => s.entity)
  const me = currentNormal()

  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const Head = ({ icon, label }: { icon: ReactNode; label: string }) => (
    <div className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-700">
      {icon}
      {label}
    </div>
  )

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Form | null>(me ? toForm(me) : null)

  if (!me || !form) {
    return (
      <div className="p-4 pb-8">
        <EmptyState title={L('No signed-in person', 'لا يوجد شخص مسجّل')} />
      </div>
    )
  }

  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => (f ? { ...f, [key]: value } : f))
  const setPrivacy = (key: keyof Form['privacy'], value: PrivacyLevel) =>
    setForm((f) => (f ? { ...f, privacy: { ...f.privacy, [key]: value } } : f))

  const cancel = () => {
    setForm(toForm(me))
    setEditing(false)
  }

  const onCv = (files: FileList | null) => {
    const f = files?.[0]
    if (!f) return
    const id = 'cv_' + f.name
    const meta: AttachmentMeta = { id, name: f.name, size: f.size, type: f.type }
    set('cv', meta)
    const reader = new FileReader()
    reader.onload = () => setForm((prev) => (prev ? { ...prev, cv: { ...meta, dataUrl: reader.result as string } } : prev))
    reader.readAsDataURL(f)
  }

  const mandatoryOk =
    !!form.fullName.trim() &&
    !!form.gender &&
    !!form.dateOfBirth &&
    !!form.nat1 &&
    !!form.residenceCountry &&
    !!form.motherTongue &&
    !!form.motherFluency &&
    !!form.lang1 &&
    !!form.lang1Fluency &&
    !!form.lang2 &&
    !!form.lang2Fluency

  const save = () => {
    if (!mandatoryOk) return
    const nationalities = [form.nat1, form.nat2, form.nat3].filter(Boolean) as Country[]
    const languages: NonNullable<NormalCharacter['languages']> = []
    const seenLang = new Set<Language>()
    const pushLang = (language: Language | '', level: Fluency) => {
      if (!language || seenLang.has(language)) return
      seenLang.add(language)
      languages.push({ language, level })
    }
    pushLang(form.motherTongue, (form.motherFluency || 'Fluent') as Fluency)
    pushLang(form.lang1, (form.lang1Fluency || 'Average') as Fluency)
    pushLang(form.lang2, (form.lang2Fluency || 'Average') as Fluency)
    updateNormal(me.id, {
      fullName: form.fullName.trim(),
      gender: form.gender as 'Male' | 'Female',
      dateOfBirth: form.dateOfBirth || undefined,
      nationalities: nationalities.length ? Array.from(new Set(nationalities)) : ['Egypt'],
      residenceCountry: (form.residenceCountry || 'Egypt') as Country,
      nationalId: form.nationalId.trim() || undefined,
      passports: form.passport.trim() ? [form.passport.trim()] : undefined,
      motherTongue: form.motherTongue as Language,
      languages,
      city: form.city.trim(),
      address1: form.address1.trim() || undefined,
      contacts: {
        ...me.contacts,
        mobile: form.mobile.trim(),
        email: form.email.trim() || undefined,
        landline: form.landline.trim() || undefined,
        linkedIn: form.linkedIn.trim() || undefined,
        facebook: form.facebook.trim() || undefined,
        whatsApp: form.whatsApp.trim() || undefined,
      },
      education: {
        school: form.school.trim() || undefined,
        university: form.university.trim() || undefined,
        postgraduate: form.postgraduate.trim() || undefined,
        phd: form.phd.trim() || undefined,
      },
      career: {
        ...me.career,
        title: form.title.trim() || undefined,
        profession: form.profession.trim() || undefined,
        industry: form.industry.trim() || undefined,
        history: form.history.trim() || undefined,
        cv: form.cv,
      },
      vacancyNotification: form.vacancyNotification,
      privacy: form.privacy,
    })
    setEditing(false)
  }

  const privacyOptions: { value: PrivacyLevel; label: string }[] = [
    { value: 'public', label: L('Public', 'عام') },
    { value: 'contacts', label: L('Directory', 'الدليل') },
    { value: 'closed', label: L('Closed', 'مغلق') },
  ]
  const privacyLabel = (v: PrivacyLevel) => privacyOptions.find((o) => o.value === v)?.label ?? v

  const RO = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-end text-sm font-medium text-slate-800">
        {value && value.length ? value : '—'}
      </span>
    </div>
  )

  const myVirtuals = virtualsFor(me.id)
  const langSummary = (n: NormalCharacter) =>
    (n.languages ?? []).map((l) => `${l.language} (${l.level})`).join(', ')

  return (
    <div className="p-4 space-y-4 pb-8">
      <button onClick={() => nav('/settings')} className="flex items-center gap-1 text-sm font-medium text-slate-500">
        <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''} />
        {t('settings')}
      </button>

      {/* header */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={me.fullName} color={me.avatarColor} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-base font-bold text-slate-800">{me.fullName}</div>
              <VerificationBadge level={levelOf(me.verification)} />
            </div>
            <div className="truncate font-address text-xs text-gate-700" dir="ltr">
              {personalAddress(me)}
            </div>
          </div>
          <Button variant={editing ? 'ghost' : 'secondary'} size="sm" onClick={() => (editing ? cancel() : setEditing(true))}>
            {editing ? <X size={16} /> : <Pencil size={16} />}
            {editing ? t('cancel') : t('change')}
          </Button>
        </div>
      </Card>

      {/* Identity */}
      <div className="space-y-2">
        <Head icon={<User size={15} />} label={L('Identity', 'الهوية')} />
        <Card className="p-4">
          {editing ? (
            <div className="space-y-3">
              <Field label={L('Full name', 'الاسم الكامل')} required>
                <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={L('Gender', 'النوع')} required>
                  <Select value={form.gender} onChange={(e) => set('gender', e.target.value as Form['gender'])}>
                    <option value="">—</option>
                    <option value="Male">{L('Male', 'ذكر')}</option>
                    <option value="Female">{L('Female', 'أنثى')}</option>
                  </Select>
                </Field>
                <Field label={L('Date of birth', 'تاريخ الميلاد')} required>
                  <Input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
                </Field>
              </div>
              <Field label={L('Nationality', 'الجنسية')} required>
                <Select value={form.nat1} onChange={(e) => set('nat1', e.target.value as Country)}>
                  <option value="">—</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={L('Nationality 2', 'الجنسية ٢')} hint={t('optional')}>
                  <Select value={form.nat2} onChange={(e) => set('nat2', e.target.value as Country)}>
                    <option value="">—</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label={L('Nationality 3', 'الجنسية ٣')} hint={t('optional')}>
                  <Select value={form.nat3} onChange={(e) => set('nat3', e.target.value as Country)}>
                    <option value="">—</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label={L('Residence country', 'بلد الإقامة')} required>
                <Select value={form.residenceCountry} onChange={(e) => set('residenceCountry', e.target.value as Country)}>
                  <option value="">—</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label={L('National ID', 'الرقم القومي')}>
                <Input value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} />
              </Field>
              <Field label={L('Internal code', 'الكود الداخلي')} hint={L('system generated', 'يُنشأ تلقائيًا')}>
                <Input value={me.internalCode ?? ''} readOnly dir="ltr" className="font-address" />
              </Field>
              <Field label={L('Passport #', 'رقم الجواز')} hint={t('optional')}>
                <Input value={form.passport} onChange={(e) => set('passport', e.target.value)} dir="ltr" />
              </Field>
              {/* Languages */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={L('Mother tongue', 'اللغة الأم')} required>
                  <Select value={form.motherTongue} onChange={(e) => set('motherTongue', e.target.value as Language)}>
                    <option value="">—</option>
                    {LANGUAGES.filter((l) => l === form.motherTongue || (l !== form.lang1 && l !== form.lang2)).map((l) => <option key={l} value={l}>{l}</option>)}
                  </Select>
                </Field>
                <Field label={L('Fluency', 'المستوى')} required>
                  <Select value={form.motherFluency} onChange={(e) => set('motherFluency', e.target.value as Fluency)}>
                    <option value="">—</option>
                    {FLUENCY.map((f) => <option key={f} value={f}>{f}</option>)}
                  </Select>
                </Field>
                <Field label={L('Language 1', 'اللغة ١')} required>
                  <Select value={form.lang1} onChange={(e) => set('lang1', e.target.value as Language)}>
                    <option value="">—</option>
                    {LANGUAGES.filter((l) => l === form.lang1 || (l !== form.motherTongue && l !== form.lang2)).map((l) => <option key={l} value={l}>{l}</option>)}
                  </Select>
                </Field>
                <Field label={L('Fluency', 'المستوى')} required>
                  <Select value={form.lang1Fluency} onChange={(e) => set('lang1Fluency', e.target.value as Fluency)}>
                    <option value="">—</option>
                    {FLUENCY.map((f) => <option key={f} value={f}>{f}</option>)}
                  </Select>
                </Field>
                <Field label={L('Language 2', 'اللغة ٢')} required>
                  <Select value={form.lang2} onChange={(e) => set('lang2', e.target.value as Language)}>
                    <option value="">—</option>
                    {LANGUAGES.filter((l) => l === form.lang2 || (l !== form.motherTongue && l !== form.lang1)).map((l) => <option key={l} value={l}>{l}</option>)}
                  </Select>
                </Field>
                <Field label={L('Fluency', 'المستوى')} required>
                  <Select value={form.lang2Fluency} onChange={(e) => set('lang2Fluency', e.target.value as Fluency)}>
                    <option value="">—</option>
                    {FLUENCY.map((f) => <option key={f} value={f}>{f}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label={L('City', 'المدينة')}>
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label={L('Address', 'العنوان')}>
                <Input value={form.address1} onChange={(e) => set('address1', e.target.value)} />
              </Field>
            </div>
          ) : (
            <>
              <RO label={L('Full name', 'الاسم الكامل')} value={form.fullName} />
              <RO label={L('Gender', 'النوع')} value={me.gender === 'Male' ? L('Male', 'ذكر') : L('Female', 'أنثى')} />
              <RO label={L('Date of birth', 'تاريخ الميلاد')} value={me.dateOfBirth} />
              <RO label={L('Nationalities', 'الجنسيات')} value={me.nationalities.join(', ')} />
              <RO label={L('Residence', 'الإقامة')} value={me.residenceCountry} />
              <RO label={L('National ID', 'الرقم القومي')} value={form.nationalId} />
              <RO label={L('Internal code', 'الكود الداخلي')} value={me.internalCode} />
              <RO label={L('Passport #', 'رقم الجواز')} value={form.passport} />
              <RO label={L('Mother tongue', 'اللغة الأم')} value={me.motherTongue} />
              <RO label={L('Languages', 'اللغات')} value={langSummary(me)} />
              <RO label={L('City', 'المدينة')} value={form.city} />
              <RO label={L('Address', 'العنوان')} value={form.address1} />
            </>
          )}
        </Card>
      </div>

      {/* Contacts */}
      <div className="space-y-2">
        <Head icon={<Phone size={15} />} label={L('Contacts', 'جهات الاتصال')} />
        <Card className="p-4">
          {editing ? (
            <div className="space-y-3">
              <Field label={L('Mobile', 'الجوال')}>
                <Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} dir="ltr" />
              </Field>
              <Field label={L('Email', 'البريد الإلكتروني')}>
                <Input value={form.email} onChange={(e) => set('email', e.target.value)} dir="ltr" />
              </Field>
              <Field label={L('Landline', 'الهاتف الأرضي')}>
                <Input value={form.landline} onChange={(e) => set('landline', e.target.value)} dir="ltr" />
              </Field>
              <Field label="LinkedIn">
                <Input value={form.linkedIn} onChange={(e) => set('linkedIn', e.target.value)} dir="ltr" />
              </Field>
              <Field label="Facebook" hint={t('optional')}>
                <Input value={form.facebook} onChange={(e) => set('facebook', e.target.value)} dir="ltr" />
              </Field>
              <Field label="WhatsApp" hint={t('optional')}>
                <Input value={form.whatsApp} onChange={(e) => set('whatsApp', e.target.value)} dir="ltr" />
              </Field>
            </div>
          ) : (
            <>
              <RO label={L('Mobile', 'الجوال')} value={form.mobile} />
              <RO label={L('Email', 'البريد الإلكتروني')} value={form.email} />
              <RO label={L('Landline', 'الهاتف الأرضي')} value={form.landline} />
              <RO label="LinkedIn" value={form.linkedIn} />
              <RO label="Facebook" value={form.facebook} />
              <RO label="WhatsApp" value={form.whatsApp} />
            </>
          )}
        </Card>
      </div>

      {/* Education */}
      <div className="space-y-2">
        <Head icon={<GraduationCap size={15} />} label={L('Education', 'التعليم')} />
        <Card className="p-4">
          {editing ? (
            <div className="space-y-3">
              <Field label={L('School', 'المدرسة')}>
                <Input value={form.school} onChange={(e) => set('school', e.target.value)} />
              </Field>
              <Field label={L('University', 'الجامعة')}>
                <Input value={form.university} onChange={(e) => set('university', e.target.value)} />
              </Field>
              <Field label={L('Postgraduate', 'الدراسات العليا')}>
                <Input value={form.postgraduate} onChange={(e) => set('postgraduate', e.target.value)} />
              </Field>
              <Field label={L('PhD', 'الدكتوراه')} hint={t('optional')}>
                <Input value={form.phd} onChange={(e) => set('phd', e.target.value)} />
              </Field>
            </div>
          ) : (
            <>
              <RO label={L('School', 'المدرسة')} value={form.school} />
              <RO label={L('University', 'الجامعة')} value={form.university} />
              <RO label={L('Postgraduate', 'الدراسات العليا')} value={form.postgraduate} />
              <RO label={L('PhD', 'الدكتوراه')} value={form.phd} />
            </>
          )}
        </Card>
      </div>

      {/* Career */}
      <div className="space-y-2">
        <Head icon={<Briefcase size={15} />} label={L('Career', 'المسار المهني')} />
        <Card className="p-4 space-y-3">
          {editing ? (
            <div className="space-y-3">
              <Field label={L('Title', 'المسمى الوظيفي')}>
                <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
              </Field>
              <Field label={L('Profession', 'المهنة')}>
                <Input value={form.profession} onChange={(e) => set('profession', e.target.value)} />
              </Field>
              <Field label={L('Industry', 'المجال')}>
                <Input value={form.industry} onChange={(e) => set('industry', e.target.value)} />
              </Field>
              <Field label={L('History', 'السيرة المهنية')} hint={t('optional')}>
                <Textarea rows={3} value={form.history} onChange={(e) => set('history', e.target.value)} />
              </Field>
              <CvPicker cv={form.cv} onPick={onCv} onRemove={() => set('cv', undefined)} L={L} />
            </div>
          ) : (
            <>
              <RO label={L('Title', 'المسمى الوظيفي')} value={form.title} />
              <RO label={L('Profession', 'المهنة')} value={form.profession} />
              <RO label={L('Industry', 'المجال')} value={form.industry} />
              {form.history && <p className="whitespace-pre-wrap pt-1 text-sm text-slate-700">{form.history}</p>}
              {form.cv && (
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                  <FileText size={13} /> {form.cv.name} <span className="text-slate-400">{humanSize(form.cv.size)}</span>
                </div>
              )}
            </>
          )}

          {/* Auto-filled career list — the person's linked virtual accounts */}
          <div className="border-t border-slate-100 pt-3">
            <div className="mb-1.5 text-xs font-semibold text-slate-500">{L('Virtual accounts', 'الحسابات الافتراضية')}</div>
            {myVirtuals.length === 0 ? (
              <p className="text-xs text-slate-400">{L('No linked positions.', 'لا توجد مناصب مرتبطة.')}</p>
            ) : (
              <div className="space-y-1.5">
                {myVirtuals.map((v) => {
                  const ent = entity(v.entityId)
                  return (
                    <div key={v.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-800">{v.positionName}</div>
                      <div className="text-[11px] text-slate-500">{ent?.commercialName ?? v.entityId}</div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-slate-400">
                        <span>
                          {L('Connected', 'ارتبط')}: <span dir="ltr">{v.connectedAt ? formatDate(v.connectedAt, lang) : formatDate(v.createdAt, lang)}</span>
                        </span>
                        <span>
                          {L('Disconnected', 'انفصل')}: <span dir="ltr">{v.disconnectedAt ? formatDate(v.disconnectedAt, lang) : L('Present', 'حتى الآن')}</span>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Privacy */}
      <div className="space-y-2">
        <Head icon={<ShieldCheck size={15} />} label={L('Privacy', 'الخصوصية')} />
        <Card className="p-4 space-y-3">
          {(
            [
              { key: 'personalInfo', label: L('Personal info', 'المعلومات الشخصية') },
              { key: 'contactsInfo', label: L('Contacts', 'جهات الاتصال') },
              { key: 'education', label: L('Education', 'التعليم') },
              { key: 'career', label: L('Career', 'المسار المهني') },
            ] as { key: keyof Form['privacy']; label: string }[]
          ).map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-700">{label}</span>
              {editing ? (
                <div className="flex gap-1">
                  {privacyOptions.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => setPrivacy(key, o.value)}
                      className={cx(
                        'rounded-full px-2.5 py-1 text-xs font-medium',
                        form.privacy[key] === o.value ? 'bg-gate-600 text-light' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-medium text-slate-800">{privacyLabel(form.privacy[key])}</span>
              )}
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-700">{L('Vacancy notifications', 'إشعارات الوظائف')}</span>
            <Toggle
              checked={form.vacancyNotification}
              onChange={(v) => (editing ? set('vacancyNotification', v) : undefined)}
            />
          </div>
        </Card>
      </div>

      {editing && (
        <Button variant="primary" full disabled={!mandatoryOk} onClick={save}>
          {t('save')}
        </Button>
      )}
    </div>
  )
}

function CvPicker({
  cv,
  onPick,
  onRemove,
  L,
}: {
  cv?: AttachmentMeta
  onPick: (files: FileList | null) => void
  onRemove: () => void
  L: (en: string, ar: string) => string
}) {
  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50">
        <Paperclip size={14} /> {cv ? L('Replace CV', 'استبدال السيرة') : L('Attach CV', 'إرفاق السيرة الذاتية')}
        <input type="file" className="hidden" onChange={(e) => { onPick(e.target.files); e.target.value = '' }} />
      </label>
      {cv && (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 py-1.5 ps-2.5 pe-1 text-[11px] font-medium text-slate-600">
          <FileText size={12} /> <span className="max-w-[10rem] truncate">{cv.name}</span>
          <button type="button" onClick={onRemove} className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-300 hover:text-slate-700" aria-label={L('Remove', 'إزالة')}>
            <X size={11} />
          </button>
        </div>
      )}
    </div>
  )
}
