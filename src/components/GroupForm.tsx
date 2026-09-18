import { useEffect, useState } from 'react'
import { Check, UsersRound, User, Briefcase } from 'lucide-react'
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
 * Create / edit a communication group. Position criteria is mandatory (≥1) and
 * multi-select; explicit members may be individual accounts, natural persons, or
 * other groups (resolved recursively at send time). Self-contained via the store.
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
  const positions = useStore((s) => s.positions)
  const normals = useStore((s) => s.normals)
  const groups = useStore((s) => s.groups)
  const addGroup = useStore((s) => s.addGroup)
  const updateGroup = useStore((s) => s.updateGroup)

  const editing = !!group

  const [name, setName] = useState('')
  const [posNames, setPosNames] = useState<string[]>([])
  const [nodeSel, setNodeSel] = useState<Record<string, string>>({})
  const [members, setMembers] = useState<string[]>([]) // virtual ids
  const [normalMembers, setNormalMembers] = useState<string[]>([]) // normal ids
  const [groupMembers, setGroupMembers] = useState<string[]>([]) // other group ids

  // (re)seed the form whenever it opens or the target group changes
  useEffect(() => {
    if (!open) return
    setName(group?.name ?? '')
    setPosNames(group?.positionNames ?? (group?.positionName ? [group.positionName] : []))
    setNodeSel({
      corporate: group?.corporateNodeId ?? '',
      relation: group?.relationNodeId ?? '',
      organization: group?.organizationNodeId ?? '',
      geographical: group?.geographicalNodeId ?? '',
    })
    setMembers(group?.explicitMemberIds ?? [])
    setNormalMembers(group?.explicitNormalIds ?? [])
    setGroupMembers(group?.memberGroupIds ?? [])
  }, [open, group])

  const entPositions = positions.filter((p) => p.entityId === entityId)
  const entStructures = structures.filter((n) => n.entityId === entityId)
  const entVirtuals = virtuals.filter((v) => v.entityId === entityId && v.status !== 'blocked')
  const otherGroups = groups.filter((g) => g.entityId === entityId && g.id !== group?.id)

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) =>
    setter((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))

  const togglePos = (n: string) =>
    setPosNames((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]))

  const payload = (): Omit<Group, 'id' | 'ownerVirtualId' | 'entityId'> => ({
    name: name.trim(),
    positionNames: posNames.length ? posNames : undefined,
    corporateNodeId: nodeSel.corporate || undefined,
    relationNodeId: nodeSel.relation || undefined,
    organizationNodeId: nodeSel.organization || undefined,
    geographicalNodeId: nodeSel.geographical || undefined,
    explicitMemberIds: members.length ? members : undefined,
    explicitNormalIds: normalMembers.length ? normalMembers : undefined,
    memberGroupIds: groupMembers.length ? groupMembers : undefined,
  })

  const valid = !!name.trim() && posNames.length > 0

  const submit = () => {
    if (!valid) return
    if (editing && group) {
      updateGroup(group.id, payload())
    } else {
      const owner = ownerVirtualId ?? entVirtuals[0]?.id
      if (!owner) return
      addGroup({ entityId, ownerVirtualId: owner, ...payload() })
    }
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? L('Edit group', 'تعديل المجموعة') : t('createGroup')}
      footer={
        <Button full onClick={submit} disabled={!valid}>
          {editing ? L('Save changes', 'حفظ التغييرات') : t('createGroup')}
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label={L('Group name', 'اسم المجموعة')} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('e.g. Board Members — Gulf', 'مثال: أعضاء المجلس — الخليج')} />
        </Field>

        {/* Position criteria — mandatory, multi-select */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Briefcase size={14} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{t('positions')}</span>
            <span className="text-rose-500">*</span>
            {posNames.length > 0 && <Badge tone="gate">{posNames.length}</Badge>}
          </div>
          {entPositions.length === 0 ? (
            <p className="px-1 text-xs text-slate-400">{L('No positions in this organization yet.', 'لا توجد وظائف في هذه المؤسسة بعد.')}</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {entPositions.map((p) => {
                const sel = posNames.includes(p.name)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePos(p.name)}
                    className={cx(
                      'rounded-full px-3 py-1 text-xs font-medium transition',
                      sel ? 'bg-gate-600 text-light' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                    )}
                  >
                    {p.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Optional structure-node criteria */}
        <div className="rounded-2xl bg-slate-50 p-3 space-y-3">
          <p className="text-xs font-semibold text-slate-500">{L('Structure criteria (optional)', 'معايير الهيكل (اختياري)')}</p>
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

        {/* Explicit members — accounts, persons, other groups */}
        <MemberList
          icon={<UsersRound size={14} className="text-slate-400" />}
          label={L('Specific accounts', 'حسابات محددة')}
          empty={L('No virtual accounts yet.', 'لا توجد حسابات افتراضية بعد.')}
          items={entVirtuals.map((v) => ({ id: v.id, title: v.positionName, sub: v.positionCode }))}
          selected={members}
          onToggle={(id) => toggle(setMembers, id)}
          color="#0d9488"
        />
        <MemberList
          icon={<User size={14} className="text-slate-400" />}
          label={L('Persons', 'أشخاص')}
          empty={L('No persons.', 'لا يوجد أشخاص.')}
          items={normals.map((n) => ({ id: n.id, title: n.fullName, sub: n.city }))}
          selected={normalMembers}
          onToggle={(id) => toggle(setNormalMembers, id)}
          color="#4f46e5"
        />
        <MemberList
          icon={<UsersRound size={14} className="text-slate-400" />}
          label={L('Other groups', 'مجموعات أخرى')}
          empty={L('No other groups.', 'لا توجد مجموعات أخرى.')}
          items={otherGroups.map((g) => ({ id: g.id, title: g.name }))}
          selected={groupMembers}
          onToggle={(id) => toggle(setGroupMembers, id)}
          color="#0d9488"
          square
        />

        {!valid && name.trim() && (
          <p className="px-1 text-[11px] leading-relaxed text-amber-600">
            {L('Select at least one position to define this group.', 'اختر وظيفة واحدة على الأقل لتعريف المجموعة.')}
          </p>
        )}
      </div>
    </Sheet>
  )
}

function MemberList({
  icon,
  label,
  empty,
  items,
  selected,
  onToggle,
  color,
  square,
}: {
  icon: React.ReactNode
  label: string
  empty: string
  items: { id: string; title: string; sub?: string }[]
  selected: string[]
  onToggle: (id: string) => void
  color: string
  square?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {selected.length > 0 && <Badge tone="teal">{selected.length}</Badge>}
      </div>
      {items.length === 0 ? (
        <p className="px-1 text-xs text-slate-400">{empty}</p>
      ) : (
        <div className="max-h-48 space-y-1.5 overflow-y-auto thin-scroll pe-0.5">
          {items.map((it) => {
            const sel = selected.includes(it.id)
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => onToggle(it.id)}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400',
                  sel ? 'border-teal-400 bg-teal-500/10' : 'border-slate-100 bg-white hover:bg-slate-50',
                )}
              >
                <Avatar name={it.title} color={color} size={34} square={square} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-800">{it.title}</div>
                  {it.sub && <div className="truncate font-mono text-[10px] text-slate-400" dir="ltr">{it.sub}</div>}
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
  )
}
