import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { personalAddress } from '@/lib/identity'
import {
  Avatar,
  Button,
  Card,
  Field,
  Input,
  Toggle,
  Modal,
  EmptyState,
} from '@/ui/primitives'
import type { NormalCharacter, PrivacyLevel } from '@/types'
import { ChevronLeft, Pencil, X, User, Phone, GraduationCap, Briefcase, ShieldCheck } from 'lucide-react'

type Form = {
  fullName: string
  city: string
  address1: string
  nationalId: string
  mobile: string
  email: string
  landline: string
  linkedIn: string
  school: string
  university: string
  postgraduate: string
  title: string
  profession: string
  industry: string
  vacancyNotification: boolean
  privacy: NormalCharacter['privacy']
}

function toForm(n: NormalCharacter): Form {
  return {
    fullName: n.fullName,
    city: n.city,
    address1: n.address1 ?? '',
    nationalId: n.nationalId ?? '',
    mobile: n.contacts.mobile,
    email: n.contacts.email ?? '',
    landline: n.contacts.landline ?? '',
    linkedIn: n.contacts.linkedIn ?? '',
    school: n.education?.school ?? '',
    university: n.education?.university ?? '',
    postgraduate: n.education?.postgraduate ?? '',
    title: n.career?.title ?? '',
    profession: n.career?.profession ?? '',
    industry: n.career?.industry ?? '',
    vacancyNotification: n.vacancyNotification ?? false,
    privacy: n.privacy,
  }
}

/** Natural-person master data — read/light-edit. Edits are session-local (no store persist). */
export function PersonalMasterData() {
  const nav = useNavigate()
  const { lang, t, isRtl } = useLang()
  const currentNormal = useStore((s) => s.currentNormal)
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
  const [savedNotice, setSavedNotice] = useState(false)

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

  const privacyOptions: { value: PrivacyLevel; label: string }[] = [
    { value: 'public', label: L('Public', 'عام') },
    { value: 'contacts', label: L('Contacts', 'جهات الاتصال') },
    { value: 'closed', label: L('Closed', 'مغلق') },
  ]

  const RO = ({ label, value }: { label: string; value?: string }) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="shrink-0 text-xs text-slate-500">{label}</span>
      <span className="min-w-0 truncate text-end text-sm font-medium text-slate-800">
        {value && value.length ? value : '—'}
      </span>
    </div>
  )

  const privacyLabel = (v: PrivacyLevel) => privacyOptions.find((o) => o.value === v)?.label ?? v

  return (
    <div className="p-4 space-y-4 pb-8">
      <button
        onClick={() => nav('/settings')}
        className="flex items-center gap-1 text-sm font-medium text-slate-500"
      >
        <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''} />
        {t('settings')}
      </button>

      {/* Address header */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={me.fullName} color={me.avatarColor} size={52} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-slate-800">{me.fullName}</div>
            <div className="truncate font-mono text-xs text-gate-700" dir="ltr">
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
              <Field label={L('Full name', 'الاسم الكامل')}>
                <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
              </Field>
              <Field label={L('National ID', 'الرقم القومي')}>
                <Input value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} />
              </Field>
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
              <RO label={L('National ID', 'الرقم القومي')} value={form.nationalId} />
              <RO label={L('Nationalities', 'الجنسيات')} value={me.nationalities.join(', ')} />
              <RO label={L('Residence', 'الإقامة')} value={me.residenceCountry} />
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
            </div>
          ) : (
            <>
              <RO label={L('Mobile', 'الجوال')} value={form.mobile} />
              <RO label={L('Email', 'البريد الإلكتروني')} value={form.email} />
              <RO label={L('Landline', 'الهاتف الأرضي')} value={form.landline} />
              <RO label="LinkedIn" value={form.linkedIn} />
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
            </div>
          ) : (
            <>
              <RO label={L('School', 'المدرسة')} value={form.school} />
              <RO label={L('University', 'الجامعة')} value={form.university} />
              <RO label={L('Postgraduate', 'الدراسات العليا')} value={form.postgraduate} />
            </>
          )}
        </Card>
      </div>

      {/* Career */}
      <div className="space-y-2">
        <Head icon={<Briefcase size={15} />} label={L('Career', 'المسار المهني')} />
        <Card className="p-4">
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
            </div>
          ) : (
            <>
              <RO label={L('Title', 'المسمى الوظيفي')} value={form.title} />
              <RO label={L('Profession', 'المهنة')} value={form.profession} />
              <RO label={L('Industry', 'المجال')} value={form.industry} />
            </>
          )}
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
                      className={
                        'rounded-full px-2.5 py-1 text-xs font-medium ' +
                        (form.privacy[key] === o.value
                          ? 'bg-gate-600 text-light'
                          : 'bg-slate-100 text-slate-500')
                      }
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
        <Button variant="primary" full onClick={() => setSavedNotice(true)}>
          {t('save')}
        </Button>
      )}

      <Modal open={savedNotice} onClose={() => setSavedNotice(false)}>
        <div className="space-y-4">
          <div className="text-base font-semibold text-slate-800">{L('Session-only changes', 'تغييرات مؤقتة')}</div>
          <p className="text-sm text-slate-500">
            {L(
              'In this demo, personal master data edits are kept in the current view only and are not persisted to the identity store.',
              'في هذا العرض التوضيحي، يتم الاحتفاظ بتعديلات البيانات الشخصية في العرض الحالي فقط ولا يتم حفظها في مخزن الهوية.',
            )}
          </p>
          <Button
            variant="primary"
            full
            onClick={() => {
              setSavedNotice(false)
              setEditing(false)
            }}
          >
            {t('done')}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
