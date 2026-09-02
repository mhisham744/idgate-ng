import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, Plus, Send, MessagesSquare } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import {
  Button,
  Card,
  Badge,
  Field,
  Input,
  Textarea,
  Select,
  EmptyState,
  Sheet,
  SectionHeader,
} from '@/ui/primitives'
import { STRUCTURE_LABELS } from '@/data/reference'
import type { Group, StructureKind } from '@/types'

const KIND_FIELDS: { field: keyof Pick<Group, 'corporateNodeId' | 'relationNodeId' | 'organizationNodeId' | 'geographicalNodeId'>; kind: StructureKind }[] = [
  { field: 'corporateNodeId', kind: 'corporate' },
  { field: 'relationNodeId', kind: 'relation' },
  { field: 'organizationNodeId', kind: 'organization' },
  { field: 'geographicalNodeId', kind: 'geographical' },
]

export function GroupsScreen() {
  const navigate = useNavigate()
  const { lang, t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const groups = useStore((s) => s.groups)
  const structures = useStore((s) => s.structures)
  const entity = useStore((s) => s.entity)
  const virtual = useStore((s) => s.virtual)
  const active = useStore((s) => s.active)
  const can = useStore((s) => s.can)
  const addGroup = useStore((s) => s.addGroup)
  const createNotification = useStore((s) => s.createNotification)

  const activeVirtual = active?.kind === 'virtual' ? virtual(active.virtualId) : undefined
  const canCreate =
    !!activeVirtual && (can('admin.createGroupVirtual') || can('admin.createGroupNormal'))

  const visible = activeVirtual
    ? groups.filter((g) => g.entityId === activeVirtual.entityId)
    : groups

  // group-by-entity for display when acting personally
  const byEntity = new Map<string, Group[]>()
  for (const g of visible) {
    const arr = byEntity.get(g.entityId) ?? []
    arr.push(g)
    byEntity.set(g.entityId, arr)
  }

  const nodeName = (id?: string) => (id ? structures.find((n) => n.id === id)?.name : undefined)

  // ── communicate composer ──
  const [target, setTarget] = useState<Group | null>(null)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sent, setSent] = useState(false)

  function openCommunicate(g: Group) {
    setTarget(g)
    setSubject('')
    setBody('')
    setSent(false)
  }
  function sendToGroup() {
    if (!target) return
    createNotification({ kind: 'idgate', to: [], subject: `[${target.name}] ${subject}`, body })
    setSent(true)
  }

  // ── create group ──
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [positionName, setPositionName] = useState('')
  const [nodeSel, setNodeSel] = useState<Record<string, string>>({})

  const entStructures = activeVirtual
    ? structures.filter((n) => n.entityId === activeVirtual.entityId)
    : []

  function submitGroup() {
    if (!activeVirtual || !name.trim()) return
    addGroup({
      entityId: activeVirtual.entityId,
      ownerVirtualId: activeVirtual.id,
      name: name.trim(),
      positionName: positionName.trim() || undefined,
      corporateNodeId: nodeSel.corporate || undefined,
      relationNodeId: nodeSel.relation || undefined,
      organizationNodeId: nodeSel.organization || undefined,
      geographicalNodeId: nodeSel.geographical || undefined,
    })
    setName('')
    setPositionName('')
    setNodeSel({})
    setCreating(false)
  }

  function criteriaBadges(g: Group) {
    const items: string[] = []
    if (g.positionName) items.push(g.positionName)
    for (const { field } of KIND_FIELDS) {
      const nm = nodeName(g[field])
      if (nm) items.push(nm)
    }
    if (g.explicitMemberIds && g.explicitMemberIds.length) {
      items.push(L(`${g.explicitMemberIds.length} members`, `${g.explicitMemberIds.length} أعضاء`))
    }
    return items
  }

  return (
    <div className="p-4 space-y-4 pb-8">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} className={isRtl ? 'rotate-180 me-1.5' : 'me-1.5'} />
        {t('back')}
      </Button>

      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800">{t('groups')}</h1>
        <p className="text-sm text-slate-500">
          {L(
            'Communication happens at an individual account or a group level — never "through the structure". A group message reaches that node level plus all levels below it.',
            'يتم التواصل على مستوى الحساب الفردي أو على مستوى مجموعة — وليس "عبر الهيكل". رسالة المجموعة تصل إلى مستوى العقدة وكل المستويات الأدنى منها.',
          )}
        </p>
      </div>

      {canCreate && (
        <Button full onClick={() => setCreating(true)}>
          <Plus size={16} className="me-1.5" />
          {t('createGroup')}
        </Button>
      )}

      {visible.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title={t('empty')} subtitle={t('groups')} />
      ) : (
        [...byEntity.entries()].map(([entId, list]) => {
          const ent = entity(entId)
          return (
            <div key={entId} className="space-y-2">
              {!activeVirtual && <SectionHeader title={ent?.commercialName ?? entId} />}
              {list.map((g) => (
                <Card key={g.id} className="p-4 space-y-3">
                  <div>
                    <div className="text-sm font-bold text-slate-800">{g.name}</div>
                    {ent && <div className="text-xs text-slate-500">{ent.commercialName}</div>}
                  </div>
                  {criteriaBadges(g).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {criteriaBadges(g).map((c, i) => (
                        <Badge key={i} tone="gate">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => openCommunicate(g)}>
                    <MessagesSquare size={14} className="me-1.5" />
                    {L('Communicate', 'تواصل')}
                  </Button>
                </Card>
              ))}
            </div>
          )
        })
      )}

      {/* communicate sheet */}
      <Sheet
        open={!!target}
        onClose={() => setTarget(null)}
        title={target?.name}
        footer={
          sent ? (
            <Button full variant="secondary" onClick={() => setTarget(null)}>
              {t('done')}
            </Button>
          ) : (
            <Button full onClick={sendToGroup} disabled={!subject.trim()}>
              <Send size={16} className="me-1.5" />
              {t('send')}
            </Button>
          )
        }
      >
        {sent ? (
          <p className="py-6 text-center text-sm text-slate-600">
            {L(
              'Message dispatched to the group node and all levels below it.',
              'تم إرسال الرسالة إلى عقدة المجموعة وكل المستويات الأدنى منها.',
            )}
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              {L('Reaches this group node and everyone below it.', 'تصل إلى عقدة المجموعة وكل من دونها.')}
            </p>
            <Field label={t('subject')} required>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </Field>
            <Field label={t('body')}>
              <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
          </div>
        )}
      </Sheet>

      {/* create sheet */}
      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title={t('createGroup')}
        footer={
          <Button full onClick={submitGroup} disabled={!name.trim()}>
            {t('createGroup')}
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label={L('Group name', 'اسم المجموعة')} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t('positions')} hint={t('optional')}>
            <Input value={positionName} onChange={(e) => setPositionName(e.target.value)} />
          </Field>
          {KIND_FIELDS.map(({ kind }) => {
            const nodes = entStructures.filter((n) => n.kind === kind)
            return (
              <Field key={kind} label={bl(STRUCTURE_LABELS[kind], lang)} hint={t('optional')}>
                <Select
                  value={nodeSel[kind] ?? ''}
                  onChange={(e) => setNodeSel((s) => ({ ...s, [kind]: e.target.value }))}
                >
                  <option value="">{L('Any', 'الكل')}</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {'— '.repeat(n.level)}
                      {n.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )
          })}
        </div>
      </Sheet>
    </div>
  )
}
