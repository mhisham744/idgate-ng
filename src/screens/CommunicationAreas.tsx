import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Network, Plus, Trash2, Building2 } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { Button, Card, Field, Input, EmptyState, Modal } from '@/ui/primitives'
import type { CommunicationArea } from '@/types'

/**
 * Manage Communication Areas — named groupings that let multiple organizations
 * communicate with one another (organizations picking the same area interoperate).
 */
export function CommunicationAreas() {
  const nav = useNavigate()
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const areas = useStore((s) => s.communicationAreas)
  const entities = useStore((s) => s.entities)
  const addCommunicationArea = useStore((s) => s.addCommunicationArea)
  const removeCommunicationArea = useStore((s) => s.removeCommunicationArea)

  const [name, setName] = useState('')
  const [del, setDel] = useState<CommunicationArea | null>(null)

  const orgsIn = (id: string) => entities.filter((e) => e.communicationAreaId === id)

  return (
    <div className="p-4 space-y-4 pb-8">
      <button onClick={() => nav('/settings')} className="flex items-center gap-1 text-sm font-medium text-slate-500">
        <ChevronLeft size={18} className={isRtl ? 'rotate-180' : ''} />
        {t('settings')}
      </button>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800">{L('Communication Areas', 'مناطق التواصل')}</h1>
        <p className="text-sm text-slate-500">
          {L(
            'Organizations that share a communication area can communicate with each other; organizations in different areas cannot. Multinationals use one area to interoperate.',
            'المؤسسات التي تشترك في منطقة تواصل واحدة يمكنها التواصل معًا؛ والمؤسسات في مناطق مختلفة لا تستطيع. تستخدم الشركات متعددة الجنسيات منطقة واحدة للتكامل.',
          )}
        </p>
      </div>

      <Card className="p-4">
        <div className="flex items-end gap-2">
          <Field label={L('New area name', 'اسم المنطقة الجديدة')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('e.g. Global Group', 'مثال: المجموعة العالمية')} />
          </Field>
          <Button
            size="sm"
            disabled={!name.trim()}
            onClick={() => {
              addCommunicationArea(name.trim())
              setName('')
            }}
          >
            <Plus size={16} className="me-1" /> {t('create')}
          </Button>
        </div>
      </Card>

      {areas.length === 0 ? (
        <EmptyState icon={<Network size={28} />} title={L('No communication areas yet', 'لا توجد مناطق تواصل بعد')} />
      ) : (
        <div className="space-y-2">
          {areas.map((a) => {
            const orgs = orgsIn(a.id)
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Network size={16} className="text-gate-600" />
                      <span className="text-sm font-bold text-slate-800">{a.name}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {orgs.length} {L(orgs.length === 1 ? 'organization' : 'organizations', 'مؤسسة')}
                    </div>
                  </div>
                  <button
                    onClick={() => setDel(a)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                    aria-label={L('Delete', 'حذف')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                {orgs.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {orgs.map((e) => (
                      <div key={e.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                        <Building2 size={13} className="text-slate-400" />
                        {e.commercialName}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={!!del} onClose={() => setDel(null)}>
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800">{L('Delete communication area', 'حذف منطقة التواصل')}</h2>
          <p className="text-sm text-slate-600">
            {L('Delete', 'حذف')} <span className="font-semibold text-slate-800">{del?.name}</span>?{' '}
            {L('Organizations in it will no longer share an area.', 'لن تشترك المؤسسات فيها بعد الآن في منطقة واحدة.')}
          </p>
          <div className="flex gap-2">
            <Button full variant="subtle" onClick={() => setDel(null)}>{t('cancel')}</Button>
            <Button full variant="danger" onClick={() => { if (del) removeCommunicationArea(del.id); setDel(null) }}>
              <Trash2 size={16} className="me-1.5" /> {L('Delete', 'حذف')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
