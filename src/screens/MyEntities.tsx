import { Building2, ChevronRight, Layers, Plus, Users, Briefcase } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { ORG_TYPE_LABELS, LEGAL_TYPE_LABELS } from '@/data/reference'
import { Avatar, Badge, Button, Card, EmptyState, SectionHeader } from '@/ui/primitives'
import type { LegalEntity } from '@/types'

export function MyEntities() {
  const navigate = useNavigate()
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const normalId = useStore((s) => s.normalId)
  const entities = useStore((s) => s.entities)
  const positions = useStore((s) => s.positions)
  const virtuals = useStore((s) => s.virtuals)
  const structures = useStore((s) => s.structures)

  const mine = entities.filter(
    (e) => e.adminNormalId === normalId || e.managingDirectorNormalId === normalId,
  )

  const statusOf = (e: LegalEntity): { text: string; tone: 'green' | 'amber' | 'red' } => {
    if (e.status === 'active') return { text: t('entityStatusActive'), tone: 'green' }
    if (e.status === 'pending') return { text: t('entityStatusPending'), tone: 'amber' }
    if (e.status === 'rejected') return { text: L('Rejected', 'مرفوض'), tone: 'red' }
    return { text: t('entityStatusDraft'), tone: 'amber' }
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <SectionHeader
        title={t('myEntities')}
        action={
          <Button size="sm" variant="secondary" onClick={() => navigate('/settings/entities/new')}>
            <Plus size={14} /> {t('registerEntity')}
          </Button>
        }
      />

      {mine.length === 0 ? (
        <EmptyState
          icon={<Building2 size={40} />}
          title={L('No organizations yet', 'لا توجد مؤسسات بعد')}
          subtitle={L(
            'Register a company, ministry, university or club to issue virtual identities.',
            'سجّل شركة أو وزارة أو جامعة أو نادٍ لإصدار هويات افتراضية.',
          )}
        />
      ) : (
        <div className="space-y-3">
          {mine.map((e) => {
            const st = statusOf(e)
            const posCount = positions.filter((p) => p.entityId === e.id).length
            const virCount = virtuals.filter((v) => v.entityId === e.id).length
            const strCount = structures.filter((n) => n.entityId === e.id).length
            return (
              <Card key={e.id} onClick={() => navigate('/settings/entity/' + e.id)} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={e.commercialName} color={e.logoColor} size={44} square icon={<Building2 size={20} />} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-800">{e.commercialName}</div>
                    <div className="truncate text-xs text-slate-500">{e.formalName}</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 rtl:rotate-180" />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone={st.tone}>{st.text}</Badge>
                  <Badge tone="gate">{bl(ORG_TYPE_LABELS[e.orgType], lang)}</Badge>
                  <Badge tone="slate">{bl(LEGAL_TYPE_LABELS[e.legalEntityType], lang)}</Badge>
                </div>

                <div className="mt-2 font-mono text-[11px] text-gate-600" dir="ltr">
                  {e.domain}.{e.orgType}.{e.legalEntityType}
                </div>

                <div className="mt-3 flex items-center gap-4 text-[11px] font-medium text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Briefcase size={13} /> {posCount} {t('positions')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users size={13} /> {virCount} {t('virtualAccountsMd')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Layers size={13} /> {strCount}
                  </span>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
