import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UsersRound, Search } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { ActorLine } from '@/components/identity'
import { Button, Card, Field, Input, Select, EmptyState } from '@/ui/primitives'
import type { Country } from '@/types'

const COUNTRIES: Country[] = ['Egypt', 'USA', 'France', 'Germany', 'India']

/**
 * Talent Acquisition — a people-search over natural persons by a set of
 * selection criteria. Demo-level: a representative subset of the spec's fields.
 * Results respect each account's personal-info privacy (closed accounts hide).
 */
export function TalentAcquisition() {
  const navigate = useNavigate()
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const normals = useStore((s) => s.normals)

  const empty = {
    firstName: '',
    middleName: '',
    surname: '',
    gender: '' as '' | 'Male' | 'Female',
    ageFrom: '',
    ageTo: '',
    nationality: '' as '' | Country,
    residence: '' as '' | Country,
    city: '',
    title: '',
    profession: '',
    industry: '',
    skills: '',
    targetJob: '',
  }
  const [c, setC] = useState(empty)
  const set = <K extends keyof typeof empty>(k: K, v: (typeof empty)[K]) => setC((f) => ({ ...f, [k]: v }))
  const [ran, setRan] = useState(false)

  const has = (hay: string | undefined, q: string) => !q.trim() || (hay ?? '').toLowerCase().includes(q.trim().toLowerCase())
  const ageOf = (dob?: string): number | null => {
    if (!dob) return null
    const d = new Date(dob)
    if (Number.isNaN(d.getTime())) return null
    const now = new Date()
    let a = now.getFullYear() - d.getFullYear()
    const m = now.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--
    return a
  }

  const results = !ran
    ? []
    : normals.filter((n) => {
        if (n.privacy?.personalInfo === 'closed') return false
        if (!has(n.firstName, c.firstName)) return false
        if (!has(n.middleName, c.middleName)) return false
        if (!has(n.surname, c.surname)) return false
        if (c.gender && n.gender !== c.gender) return false
        const age = ageOf(n.dateOfBirth)
        if (c.ageFrom && (age == null || age < Number(c.ageFrom))) return false
        if (c.ageTo && (age == null || age > Number(c.ageTo))) return false
        if (c.nationality && !(n.nationalities ?? []).includes(c.nationality)) return false
        if (c.residence && n.residenceCountry !== c.residence) return false
        if (!has(n.city, c.city)) return false
        if (!has(n.career?.title, c.title)) return false
        if (!has(n.career?.profession, c.profession)) return false
        if (!has(n.career?.industry, c.industry)) return false
        if (!has(n.career?.specialtiesSkills, c.skills)) return false
        if (!has(n.career?.targetJob, c.targetJob)) return false
        return true
      })

  return (
    <div className="p-4 space-y-4 pb-8">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} className={isRtl ? 'rotate-180 me-1.5' : 'me-1.5'} />
        {t('back')}
      </Button>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800">{t('talentAcquisition')}</h1>
        <p className="text-sm text-slate-500">
          {L('Search people by selection criteria. Results respect each account’s privacy.', 'ابحث عن الأشخاص حسب معايير الاختيار. تحترم النتائج خصوصية كل حساب.')}
        </p>
      </div>

      <Card className="p-4 space-y-2.5">
        <div className="grid grid-cols-3 gap-2">
          <Field label={L('First name', 'الاسم الأول')}><Input value={c.firstName} onChange={(e) => set('firstName', e.target.value)} /></Field>
          <Field label={L('Middle name', 'الاسم الأوسط')}><Input value={c.middleName} onChange={(e) => set('middleName', e.target.value)} /></Field>
          <Field label={L('Surname', 'اللقب')}><Input value={c.surname} onChange={(e) => set('surname', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label={L('Gender', 'النوع')}>
            <Select value={c.gender} onChange={(e) => set('gender', e.target.value as typeof empty.gender)}>
              <option value="">{L('Any', 'الكل')}</option>
              <option value="Male">{L('Male', 'ذكر')}</option>
              <option value="Female">{L('Female', 'أنثى')}</option>
            </Select>
          </Field>
          <Field label={L('Age from', 'العمر من')}><Input type="number" value={c.ageFrom} onChange={(e) => set('ageFrom', e.target.value)} /></Field>
          <Field label={L('Age to', 'العمر إلى')}><Input type="number" value={c.ageTo} onChange={(e) => set('ageTo', e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label={L('Nationality', 'الجنسية')}>
            <Select value={c.nationality} onChange={(e) => set('nationality', e.target.value as typeof empty.nationality)}>
              <option value="">{L('Any', 'الكل')}</option>
              {COUNTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
          </Field>
          <Field label={L('Residence country', 'بلد الإقامة')}>
            <Select value={c.residence} onChange={(e) => set('residence', e.target.value as typeof empty.residence)}>
              <option value="">{L('Any', 'الكل')}</option>
              {COUNTRIES.map((x) => <option key={x} value={x}>{x}</option>)}
            </Select>
          </Field>
        </div>
        <Field label={L('City', 'المدينة')}><Input value={c.city} onChange={(e) => set('city', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={L('Title', 'المسمى')}><Input value={c.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label={L('Profession', 'المهنة')}><Input value={c.profession} onChange={(e) => set('profession', e.target.value)} /></Field>
          <Field label={L('Industry', 'المجال')}><Input value={c.industry} onChange={(e) => set('industry', e.target.value)} /></Field>
          <Field label={L('Target job', 'الوظيفة المستهدفة')}><Input value={c.targetJob} onChange={(e) => set('targetJob', e.target.value)} /></Field>
        </div>
        <Field label={L('Specialties & skills', 'التخصصات والمهارات')}><Input value={c.skills} onChange={(e) => set('skills', e.target.value)} /></Field>
        <div className="flex gap-2 pt-1">
          <Button full onClick={() => setRan(true)}><Search size={16} /> {t('run')}</Button>
          <Button variant="subtle" onClick={() => { setC(empty); setRan(false) }}>{t('clear')}</Button>
        </div>
      </Card>

      {ran && (
        results.length === 0 ? (
          <EmptyState icon={<UsersRound size={28} />} title={t('empty')} subtitle={t('talentAcquisition')} />
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{results.length} {t('results')}</div>
            {results.map((n) => (
              <Card key={n.id} className="p-3">
                <ActorLine actor={{ kind: 'normal', normalId: n.id }} size={36} />
                {(n.career?.title || n.city) && (
                  <div className="mt-1 ps-[46px] text-[11px] text-slate-500">
                    {[n.career?.title, n.city, n.residenceCountry].filter(Boolean).join(' · ')}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
