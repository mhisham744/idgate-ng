import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Link2, Search, Check } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { Button, Card, Field, Select, Input, EmptyState, Badge, cx } from '@/ui/primitives'
import type { Validity } from '@/types'

/** A small Open | Limited(from/to) validity control. */
function ValidityPicker({ value, onChange, L }: { value: Validity; onChange: (v: Validity) => void; L: (en: string, ar: string) => string }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange({ open: true })}
          className={cx('inline-flex min-h-[40px] items-center rounded-full px-3 py-2 text-xs font-medium', value.open ? 'bg-gate-600 text-light' : 'bg-slate-100 text-slate-600')}
        >
          {L('Open', 'مفتوح')}
        </button>
        <button
          type="button"
          onClick={() => onChange({ open: false, from: value.from, to: value.to })}
          className={cx('inline-flex min-h-[40px] items-center rounded-full px-3 py-2 text-xs font-medium', !value.open ? 'bg-gate-600 text-light' : 'bg-slate-100 text-slate-600')}
        >
          {L('Limited', 'محدود')}
        </button>
      </div>
      {!value.open && (
        <div className="grid grid-cols-2 gap-2">
          <Field label={L('From', 'من')}>
            <Input type="date" value={value.from ?? ''} onChange={(e) => onChange({ ...value, open: false, from: e.target.value })} />
          </Field>
          <Field label={L('To', 'إلى')}>
            <Input type="date" value={value.to ?? ''} onChange={(e) => onChange({ ...value, open: false, to: e.target.value })} />
          </Field>
        </div>
      )}
    </div>
  )
}

/**
 * Link Request — link one or more natural persons to a virtual entity, with a
 * validity window and an optional delegation grant. Persons are searched by name,
 * internal code, or mobile. Sending creates a 'waiting' link on the entity.
 */
export function LinkPosition() {
  const nav = useNavigate()
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const normalId = useStore((s) => s.normalId)
  const entities = useStore((s) => s.entities)
  const virtuals = useStore((s) => s.virtuals)
  const normals = useStore((s) => s.normals)
  const delegations = useStore((s) => s.delegations)
  const requestLink = useStore((s) => s.requestLink)

  const myEntities = useMemo(
    () => entities.filter((e) => e.adminNormalId === normalId || e.managingDirectorNormalId === normalId),
    [entities, normalId],
  )

  const [entId, setEntId] = useState('')
  const [vId, setVId] = useState('')
  const [nId, setNId] = useState('')
  const [query, setQuery] = useState('')
  const [linkValidity, setLinkValidity] = useState<Validity>({ open: true })
  const [delId, setDelId] = useState('')
  const [delValidity, setDelValidity] = useState<Validity>({ open: true })
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const entVirtuals = entId ? virtuals.filter((v) => v.entityId === entId) : []
  const entDelegations = entId ? delegations.filter((d) => d.entityId === entId) : []

  const q = query.trim().toLowerCase()
  const people = useMemo(
    () =>
      normals.filter(
        (n) =>
          !q ||
          n.fullName.toLowerCase().includes(q) ||
          (n.internalCode ?? '').toLowerCase().includes(q) ||
          n.contacts.mobile.replace(/\s+/g, '').includes(q.replace(/\s+/g, '')),
      ),
    [normals, q],
  )

  const send = () => {
    if (!entId || !vId || !nId) return
    const del = entDelegations.find((d) => d.id === delId)
    const ok = requestLink(entId, vId, nId, {
      validity: linkValidity,
      delegation: del ? { subject: del.subject, limit: del.limit, limitAmount: del.limitAmount, validity: delValidity } : undefined,
    })
    if (ok) {
      setMsg({ tone: 'ok', text: L('Link request sent — waiting for the person to accept (from their Directory).', 'تم إرسال طلب الربط — بانتظار قبول الشخص (من الدليل).') })
      setNId('')
    } else {
      setMsg({ tone: 'err', text: L('This person is already linked or has a pending request on this entity.', 'هذا الشخص مرتبط بالفعل أو لديه طلب معلّق على هذا الكيان.') })
    }
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <button onClick={() => nav('/settings')} className="flex items-center gap-1 text-sm font-medium text-slate-500">
        <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''} />
        {t('settings')}
      </button>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-gate-600" />
          <h1 className="text-xl font-bold text-slate-800">{L('Link Request', 'طلب ربط')}</h1>
        </div>
        <p className="text-sm text-slate-500">
          {L(
            'Link one or more natural persons to a virtual entity. The person must accept from their Directory.',
            'اربط شخصًا أو أكثر بكيان افتراضي. يجب أن يقبل الشخص من الدليل.',
          )}
        </p>
      </div>

      {myEntities.length === 0 ? (
        <EmptyState icon={<Link2 size={28} />} title={L('You do not administer any organization.', 'لا تدير أي مؤسسة.')} />
      ) : (
        <Card className="p-4 space-y-3">
          <Field label={L('Organization', 'المؤسسة')} required>
            <Select value={entId} onChange={(e) => { setEntId(e.target.value); setVId(''); setDelId(''); setMsg(null) }}>
              <option value="">—</option>
              {myEntities.map((e) => (
                <option key={e.id} value={e.id}>{e.commercialName}</option>
              ))}
            </Select>
          </Field>
          <Field label={L('Virtual entity', 'الكيان الافتراضي')} required>
            <Select value={vId} onChange={(e) => setVId(e.target.value)} disabled={!entId}>
              <option value="">—</option>
              {entVirtuals.map((v) => (
                <option key={v.id} value={v.id}>{v.positionName}</option>
              ))}
            </Select>
          </Field>

          <Field label={L('Find person (name / internal code / mobile)', 'ابحث عن شخص (اسم / كود داخلي / جوال)')}>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Search…', 'بحث…')} className="ps-9" />
            </div>
          </Field>
          <div className="max-h-52 space-y-1.5 overflow-y-auto thin-scroll pe-0.5">
            {people.map((n) => {
              const sel = nId === n.id
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNId(n.id)}
                  className={cx(
                    'flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-start transition',
                    sel ? 'border-gate-400 bg-gate-50' : 'border-slate-100 bg-white hover:bg-slate-50',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{n.fullName}</div>
                    <div className="truncate font-address text-[10px] text-slate-400" dir="ltr">
                      {n.internalCode ?? '—'} · {n.contacts.mobile}
                    </div>
                  </div>
                  {sel && <Check size={16} className="shrink-0 text-gate-600" />}
                </button>
              )
            })}
          </div>

          <Field label={L('Link validity', 'صلاحية الربط')}>
            <div />
          </Field>
          <ValidityPicker value={linkValidity} onChange={setLinkValidity} L={L} />

          <div className="border-t border-slate-100 pt-3 space-y-2">
            <Field label={L('Grant delegation (optional)', 'منح تفويض (اختياري)')}>
              <Select value={delId} onChange={(e) => setDelId(e.target.value)} disabled={!entId}>
                <option value="">{L('None', 'بدون')}</option>
                {entDelegations.map((d) => (
                  <option key={d.id} value={d.id}>{d.subject}{d.limitAmount != null ? ` (${d.limitAmount.toLocaleString()})` : ''}</option>
                ))}
              </Select>
            </Field>
            {delId && (
              <>
                <div className="text-xs text-slate-500">{L('Delegation validity', 'صلاحية التفويض')}</div>
                <ValidityPicker value={delValidity} onChange={setDelValidity} L={L} />
              </>
            )}
          </div>

          <Button full disabled={!entId || !vId || !nId} onClick={send}>
            <Link2 size={16} className="me-1.5" /> {L('Send link request', 'إرسال طلب الربط')}
          </Button>

          {msg && (
            <div className={cx('rounded-2xl px-3 py-2 text-xs font-medium', msg.tone === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600')}>
              {msg.text}
            </div>
          )}
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Badge tone="slate">{L('Tip', 'تلميح')}</Badge>
            {L('Multiple people can be linked to the same virtual entity.', 'يمكن ربط عدة أشخاص بنفس الكيان الافتراضي.')}
          </p>
        </Card>
      )}
    </div>
  )
}
