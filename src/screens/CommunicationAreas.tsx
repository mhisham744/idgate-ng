import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Network, Plus, Building2 } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { Button, Card, Field, Input, EmptyState } from '@/ui/primitives'

/**
 * Manage Communication Areas — named groupings that let multiple organizations
 * communicate with one another (organizations picking the same area interoperate).
 * The list shows only areas the account can see (created by them, or used by an
 * organization one of their virtual accounts belongs to). Areas are not deletable.
 */
export function CommunicationAreas() {
  const nav = useNavigate()
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const normalId = useStore((s) => s.normalId)
  const areas = useStore((s) => s.communicationAreas)
  const entities = useStore((s) => s.entities)
  const virtuals = useStore((s) => s.virtuals)
  const addCommunicationArea = useStore((s) => s.addCommunicationArea)

  const [name, setName] = useState('')

  const orgsIn = (id: string) => entities.filter((e) => e.communicationAreaId === id)

  // Visible areas: created by me, or the area of an org one of my virtuals belongs to.
  const visibleAreas = useMemo(() => {
    const myEntityIds = new Set(virtuals.filter((v) => v.linkedNormalId === normalId).map((v) => v.entityId))
    const myAreaIds = new Set(
      entities.filter((e) => myEntityIds.has(e.id)).map((e) => e.communicationAreaId).filter(Boolean) as string[],
    )
    return areas.filter((a) => a.createdByNormalId === normalId || myAreaIds.has(a.id))
  }, [areas, entities, virtuals, normalId])

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

      {visibleAreas.length === 0 ? (
        <EmptyState icon={<Network size={28} />} title={L('No communication areas yet', 'لا توجد مناطق تواصل بعد')} />
      ) : (
        <div className="space-y-2">
          {visibleAreas.map((a) => {
            const orgs = orgsIn(a.id)
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-center gap-2">
                  <Network size={16} className="text-gate-600" />
                  <span className="text-sm font-bold text-slate-800">{a.name}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {orgs.length} {L(orgs.length === 1 ? 'organization' : 'organizations', 'مؤسسة')}
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
    </div>
  )
}
