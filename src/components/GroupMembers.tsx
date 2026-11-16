import { useMemo } from 'react'
import { UsersRound } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { actorKey } from '@/lib/identity'
import { ActorLine } from '@/components/identity'
import { Modal, EmptyState } from '@/ui/primitives'
import type { Group } from '@/types'

/**
 * Displays the full resolved member list of a group — every account the group
 * reaches via its criteria, explicit members, and nested groups, including the
 * group creator. Reachable by any group member (CN 4/11 items 5, 8).
 */
export function GroupMembersSheet({ group, onClose }: { group: Group | null; onClose: () => void }) {
  const { isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const groupRecipients = useStore((s) => s.groupRecipients)

  const members = useMemo(() => {
    if (!group) return []
    const seen = new Set<string>()
    const out = []
    for (const r of groupRecipients(group.id)) {
      const k = actorKey(r)
      if (!seen.has(k)) {
        seen.add(k)
        out.push(r)
      }
    }
    return out
  }, [group, groupRecipients])

  return (
    <Modal open={!!group} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-800">{group?.name}</h2>
          <p className="text-xs text-slate-500">
            {members.length} {L('members', 'أعضاء')}
          </p>
        </div>
        {members.length === 0 ? (
          <EmptyState icon={<UsersRound size={28} />} title={L('No members', 'لا يوجد أعضاء')} />
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto thin-scroll">
            {members.map((r) => (
              <div key={actorKey(r)} className="rounded-2xl bg-slate-50 px-3 py-2">
                <ActorLine actor={r} size={38} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
