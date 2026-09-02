import { useEffect, useState } from 'react'
import { Check, UsersRound } from 'lucide-react'
import { useStore } from '@/store'
import { bl } from '@/i18n'
import { STRUCTURE_LABELS } from '@/data/reference'
import type { Group, StructureKind } from '@/types'
import { Avatar, Badge, Button, Field, Input, Select, Sheet, cx } from '@/ui/primitives'

const KIND_FIELDS: { field: NodeField; kind: StructureKind }[] = [
  { field: 'corporateNodeId', kind: 'corporate' },
  { field: 'relationNodeId', kind: 'relation' },
  { field: 'organizationNodeId', kind: 'organization' },
  { field: 'geographicalNodeId', kind: 'geographical' },
]

type NodeField = 'corporateNodeId' | 'relationNodeId' | 'organizationNodeId' | 'geographicalNodeId'

/**
 * Create / edit a communication group. Self-contained: reads structures &
 * virtuals from the store and writes via addGroup / updateGroup.
 * Pass `group` to edit an existing one; omit it (with `ownerVirtualId`) to create.
 */
export function GroupFormSheet({
  open,
  onClose,
  entityId,
  ownerVirtualId,
  group,
  lang,
  L,
  t,
}: {
  open: boolean
  onClose: () => void
  entityId: string
  ownerVirtualId?: string
  group?: Group | null
  lang: 'en' | 'ar'
  L: (en: string, ar: string) => string
  t: (k: string) => string
}) {
  const structures = useStore((s) => s.structures)
  const virtuals = useStore((s) => s.virtuals)
  const addGroup = useStore((s) => s.addGroup)
  const updateGroup = useStore((s) => s.updateGroup)

  const editing = !!group

  const [name, setName] = useState('')
  const [positionName, setPositionName] = useState('')
  const [nodeSel, setNodeSel] = useState<Record<string, string>>({})
  const [members, setMembers] = useState<string[]>([])

  // (re)seed the form whenever it opens or the target group changes
  useEffect(() => {
    if (!open) return
    setName(group?.name ?? '')
    setPositionName(group?.positionName ?? '')
    setNodeSel({
      corporate: group?.corporateNodeId ?? '',
      relation: group?.relationNodeId ?? '',
      organization: group?.organizationNodeId ?? '',
      geographical: group?.geographicalNodeId ?? '',
    })
    setMembers(group?.explicitMemberIds ?? [])
  }, [open, group])

  const entStructures = structures.filter((n) => n.entityId === entityId)
  const entVirtuals = virtuals.filter((v) => v.entityId === entityId && v.status !== 'blocked')

  const toggleMember = (id: string) =>
    setMembers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))

  const payload = (): Omit<Group, 'id' | 'ownerVirtualId' | 'entityId'> => ({
    name: name.trim(),
    positionName: positionName.trim() || undefined,
    corporateNodeId: nodeSel.corporate || undefined,
    relationNodeId: nodeSel.relation || undefined,
    organizationNodeId: nodeSel.organization || undefined,
    geographicalNodeId: nodeSel.geographical || undefined,
    explicitMemberIds: members.length ? members : undefined,
  })

  const submit = () => {
    if (!name.trim()) return
    if (editing && group) {
      updateGroup(group.id, payload())
    } else {
      const owner = ownerVirtualId ?? entVirtuals[0]?.id
      if (!owner) return
      addGroup({ entityId, ownerVirtualId: owner, ...payload() })
    }
    onClose()
  }

  const hasCriteria =
    !!positionName.trim() ||
    Object.values(nodeSel).some(Boolean) ||
    members.length > 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? L('Edit group', 'تعديل المجموعة') : t('createGroup')}
      footer={
        <Button full onClick={submit} disabled={!name.trim()}>
          {editing ? L('Save changes', 'حفظ التغييرات') : t('createGroup')}
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label={L('Group name', 'اسم المجموعة')} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('e.g. Board Members — Gulf', 'مثال: أعضاء المجلس — الخليج')} />
        </Field>

        <div className="rounded-2xl bg-slate-50 p-3 space-y-3">
          <p className="text-xs font-semibold text-slate-500">{L('Membership criteria', 'معايير العضوية')}</p>
          <Field label={t('positions')} hint={t('optional')}>
            <Input value={positionName} onChange={(e) => setPositionName(e.target.value)} placeholder={L('Any position', 'أي وظيفة')} />
          </Field>
          {KIND_FIELDS.map(({ kind }) => {
            const nodes = entStructures.filter((n) => n.kind === kind && n.level > 0)
            return (
              <Field key={kind} label={bl(STRUCTURE_LABELS[kind], lang)} hint={t('optional')}>
                <Select
                  value={nodeSel[kind] ?? ''}
                  onChange={(e) => setNodeSel((s) => ({ ...s, [kind]: e.target.value }))}
                  disabled={nodes.length === 0}
                >
                  <option value="">{L('Any', 'الكل')}</option>
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {'— '.repeat(Math.max(0, n.level - 1))}
                      {n.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )
          })}
        </div>

        {/* explicit members */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <UsersRound size={14} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{L('Specific members', 'أعضاء محددون')}</span>
            {members.length > 0 && <Badge tone="teal">{members.length}</Badge>}
          </div>
          {entVirtuals.length === 0 ? (
            <p className="px-1 text-xs text-slate-400">{L('No virtual accounts in this organization yet.', 'لا توجد حسابات افتراضية في هذه المؤسسة بعد.')}</p>
          ) : (
            <div className="max-h-56 space-y-1.5 overflow-y-auto thin-scroll pe-0.5">
              {entVirtuals.map((v) => {
                const sel = members.includes(v.id)
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleMember(v.id)}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400',
                      sel ? 'border-teal-400 bg-teal-500/10' : 'border-slate-100 bg-white hover:bg-slate-50',
                    )}
                  >
                    <Avatar name={v.positionName} color="#0d9488" size={34} square />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-slate-800">{v.positionName}</div>
                      {v.positionCode && (
                        <div className="truncate font-mono text-[10px] text-slate-400" dir="ltr">{v.positionCode}</div>
                      )}
                    </div>
                    <span
                      className={cx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition',
                        sel ? 'border-teal-500 bg-teal-500 text-light' : 'border-slate-300',
                      )}
                    >
                      {sel && <Check size={13} />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {!hasCriteria && name.trim() && (
          <p className="px-1 text-[11px] leading-relaxed text-amber-600">
            {L(
              'No criteria set — this group would match the whole organization. Add a position, structure node, or specific members to narrow it.',
              'لم يتم تحديد معايير — ستشمل هذه المجموعة المؤسسة بأكملها. أضف وظيفة أو عقدة هيكلية أو أعضاء محددين لتضييقها.',
            )}
          </p>
        )}
      </div>
    </Sheet>
  )
}
