import { useEffect, useState } from 'react'
import { Check, UsersRound, User } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { useDirectory } from '@/lib/userScope'
import { actorKey } from '@/lib/identity'
import { useResolveActor } from '@/components/identity'
import type { ActorRef, Group } from '@/types'
import { Avatar, Badge, Button, Field, Input, Sheet, cx } from '@/ui/primitives'

/**
 * Create / edit a communication group from the acting account's DIRECTORY:
 * members are people (persons/virtuals) and other groups already in the directory.
 * No positions or structure criteria — groups are built from real accounts/groups.
 */
export function GroupFormSheet({
  open,
  onClose,
  group,
}: {
  open: boolean
  onClose: () => void
  group?: Group | null
}) {
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const active = useStore((s) => s.active)
  const virtual = useStore((s) => s.virtual)
  const addGroup = useStore((s) => s.addGroup)
  const updateGroup = useStore((s) => s.updateGroup)
  const dir = useDirectory()
  const resolve = useResolveActor()

  const editing = !!group
  const [name, setName] = useState('')
  const [memberKeys, setMemberKeys] = useState<string[]>([]) // actorKeys of selected people
  const [groupIds, setGroupIds] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    setName(group?.name ?? '')
    const keys = [
      ...(group?.explicitMemberIds ?? []).map((id) => `v:${id}`),
      ...(group?.explicitNormalIds ?? []).map((id) => `n:${id}`),
    ]
    setMemberKeys(keys)
    setGroupIds(group?.memberGroupIds ?? [])
  }, [open, group])

  // Directory people, and other groups (exclude the one being edited).
  const people = dir.people
  const otherGroups = dir.groups.filter((g) => g.id !== group?.id)

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) =>
    setter((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]))

  const valid = !!name.trim() && (memberKeys.length > 0 || groupIds.length > 0)

  const save = () => {
    if (!valid || !active) return
    const explicitMemberIds = memberKeys.filter((k) => k.startsWith('v:')).map((k) => k.slice(2))
    const explicitNormalIds = memberKeys.filter((k) => k.startsWith('n:')).map((k) => k.slice(2))
    const owner =
      active.kind === 'virtual'
        ? { ownerVirtualId: active.virtualId, entityId: virtual(active.virtualId)?.entityId }
        : { ownerNormalId: active.normalId }
    const payload: Omit<Group, 'id'> = {
      name: name.trim(),
      ...owner,
      explicitMemberIds: explicitMemberIds.length ? explicitMemberIds : undefined,
      explicitNormalIds: explicitNormalIds.length ? explicitNormalIds : undefined,
      memberGroupIds: groupIds.length ? groupIds : undefined,
    }
    if (editing && group) updateGroup(group.id, payload)
    else addGroup(payload)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? L('Edit group', 'تعديل المجموعة') : t('createGroup')}
      footer={
        <Button full onClick={save} disabled={!valid}>
          {editing ? L('Save changes', 'حفظ التغييرات') : t('createGroup')}
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label={L('Group name', 'اسم المجموعة')} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('e.g. Project team', 'مثال: فريق المشروع')} />
        </Field>

        {/* People from the directory */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <User size={14} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-700">{L('People (from your directory)', 'أشخاص (من دليلك)')}</span>
            {memberKeys.length > 0 && <Badge tone="teal">{memberKeys.length}</Badge>}
          </div>
          {people.length === 0 ? (
            <p className="px-1 text-xs text-slate-400">{L('No one in your directory yet.', 'لا أحد في دليلك بعد.')}</p>
          ) : (
            <div className="max-h-52 space-y-1.5 overflow-y-auto thin-scroll pe-0.5">
              {people.map((r) => {
                const k = actorKey(r)
                const sel = memberKeys.includes(k)
                const info = resolve(r)
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggle(setMemberKeys, k)}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-start transition',
                      sel ? 'border-teal-400 bg-teal-500/10' : 'border-slate-100 bg-white hover:bg-slate-50',
                    )}
                  >
                    <Avatar name={info.displayName} color={info.color} size={32} square={(r as ActorRef).kind === 'virtual'} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{info.displayName}</span>
                    <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', sel ? 'border-teal-500 bg-teal-500 text-light' : 'border-slate-300')}>
                      {sel && <Check size={13} />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Other groups from the directory */}
        {otherGroups.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <UsersRound size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-700">{L('Other groups', 'مجموعات أخرى')}</span>
              {groupIds.length > 0 && <Badge tone="teal">{groupIds.length}</Badge>}
            </div>
            <div className="max-h-40 space-y-1.5 overflow-y-auto thin-scroll pe-0.5">
              {otherGroups.map((g) => {
                const sel = groupIds.includes(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggle(setGroupIds, g.id)}
                    className={cx(
                      'flex w-full items-center gap-2.5 rounded-2xl border p-2.5 text-start transition',
                      sel ? 'border-teal-400 bg-teal-500/10' : 'border-slate-100 bg-white hover:bg-slate-50',
                    )}
                  >
                    <Avatar name={g.name} color="#0d9488" size={32} square />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{g.name}</span>
                    <span className={cx('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border', sel ? 'border-teal-500 bg-teal-500 text-light' : 'border-slate-300')}>
                      {sel && <Check size={13} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {!valid && name.trim() && (
          <p className="px-1 text-[11px] text-amber-600">{L('Select at least one member or group.', 'اختر عضوًا واحدًا أو مجموعة على الأقل.')}</p>
        )}
      </div>
    </Sheet>
  )
}
