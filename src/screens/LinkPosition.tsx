import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Link2 } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { virtualAddress } from '@/lib/identity'
import { Button, Card, Field, Select, EmptyState, Badge } from '@/ui/primitives'

/**
 * Standalone "Link a Position to a Person" function (extracted from the org wizard)
 * so HR-type users can link positions without entering organization settings.
 */
export function LinkPosition() {
  const nav = useNavigate()
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const normalId = useStore((s) => s.normalId)
  const entities = useStore((s) => s.entities)
  const virtuals = useStore((s) => s.virtuals)
  const normals = useStore((s) => s.normals)
  const entity = useStore((s) => s.entity)
  const createLinkRequest = useStore((s) => s.createLinkRequest)
  const linkVirtual = useStore((s) => s.linkVirtual)

  const myEntities = useMemo(
    () => entities.filter((e) => e.adminNormalId === normalId || e.managingDirectorNormalId === normalId),
    [entities, normalId],
  )

  const [entId, setEntId] = useState('')
  const [vId, setVId] = useState('')
  const [nId, setNId] = useState('')
  const [msg, setMsg] = useState('')

  const entVirtuals = entId ? virtuals.filter((v) => v.entityId === entId) : []
  const ent = entId ? entity(entId) : undefined

  return (
    <div className="p-4 space-y-4 pb-8">
      <button onClick={() => nav('/settings')} className="flex items-center gap-1 text-sm font-medium text-slate-500">
        <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''} />
        {t('settings')}
      </button>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link2 size={18} className="text-gate-600" />
          <h1 className="text-xl font-bold text-slate-800">{L('Link a Position to a Person', 'ربط منصب بشخص')}</h1>
        </div>
        <p className="text-sm text-slate-500">
          {L(
            'A position stays dormant until a natural person accepts the link and becomes its host.',
            'يبقى المنصب خاملًا حتى يقبل شخص طبيعي الربط ويصبح مضيفه.',
          )}
        </p>
      </div>

      {myEntities.length === 0 ? (
        <EmptyState icon={<Link2 size={28} />} title={L('You do not administer any organization.', 'لا تدير أي مؤسسة.')} />
      ) : (
        <Card className="p-4 space-y-3">
          <Field label={L('Organization', 'المؤسسة')} required>
            <Select value={entId} onChange={(e) => { setEntId(e.target.value); setVId(''); setMsg('') }}>
              <option value="">—</option>
              {myEntities.map((e) => (
                <option key={e.id} value={e.id}>{e.commercialName}</option>
              ))}
            </Select>
          </Field>
          <Field label={L('Virtual account (position)', 'الحساب الافتراضي (المنصب)')} required>
            <Select value={vId} onChange={(e) => setVId(e.target.value)} disabled={!entId}>
              <option value="">—</option>
              {entVirtuals.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.positionName}{v.status === 'active' ? ` · ${L('linked', 'مرتبط')}` : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={L('Person', 'الشخص')} required>
            <Select value={nId} onChange={(e) => setNId(e.target.value)}>
              <option value="">—</option>
              {normals.map((n) => (
                <option key={n.id} value={n.id}>{n.fullName}</option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              disabled={!entId || !vId || !nId}
              onClick={() => {
                createLinkRequest(entId, vId, nId)
                setMsg(L('Link request sent — awaiting acceptance from the person (Directory).', 'تم إرسال طلب الربط — بانتظار قبول الشخص (الدليل).'))
              }}
            >
              {L('Send link request', 'إرسال طلب ربط')}
            </Button>
            <Button
              className="flex-1"
              disabled={!entId || !vId || !nId}
              onClick={() => {
                linkVirtual(vId, nId)
                const v = entVirtuals.find((x) => x.id === vId)
                const host = normals.find((x) => x.id === nId)
                setMsg(v && ent ? virtualAddress({ ...v, linkedNormalId: nId }, ent, host) : L('Linked.', 'تم الربط.'))
              }}
            >
              {L('Link now (demo)', 'ربط فوري (تجربة)')}
            </Button>
          </div>
          {msg && (
            <div className="rounded-2xl bg-emerald-50 px-3 py-2 font-mono text-[11px] text-emerald-700" dir="ltr">
              {msg}
            </div>
          )}
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Badge tone="slate">{L('Tip', 'تلميح')}</Badge>
            {L('The person accepts a link request from the Directory screen.', 'يقبل الشخص طلب الربط من شاشة الدليل.')}
          </p>
        </Card>
      )}
    </div>
  )
}
