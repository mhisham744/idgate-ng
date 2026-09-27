import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UsersRound, Plus, Pencil, Trash2 } from 'lucide-react'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { Button, Card, Badge, EmptyState, Modal } from '@/ui/primitives'
import { GroupFormSheet } from '@/components/GroupForm'
import type { Group } from '@/types'

/**
 * Groups — CREATE & manage your own communication groups (built from your
 * directory). Browsing groups you belong to lives in the Directory function.
 */
export function GroupsScreen() {
  const navigate = useNavigate()
  const { t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const groups = useStore((s) => s.groups)
  const active = useStore((s) => s.active)
  const removeGroup = useStore((s) => s.removeGroup)

  // Groups this account owns.
  const myGroups = groups.filter((g) =>
    active?.kind === 'virtual' ? g.ownerVirtualId === active.virtualId : g.ownerNormalId === active?.normalId,
  )

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Group | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)

  const memberCount = (g: Group) =>
    (g.explicitMemberIds?.length ?? 0) + (g.explicitNormalIds?.length ?? 0) + (g.memberGroupIds?.length ?? 0)

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
            'Build a group from people and other groups in your directory. Groups you belong to are shown in the Directory.',
            'أنشئ مجموعة من الأشخاص والمجموعات الموجودة في دليلك. تظهر المجموعات التي تنتمي إليها في الدليل.',
          )}
        </p>
      </div>

      <Button full onClick={() => { setEditTarget(null); setFormOpen(true) }}>
        <Plus size={16} className="me-1.5" />
        {t('createGroup')}
      </Button>

      {myGroups.length === 0 ? (
        <EmptyState icon={<UsersRound size={28} />} title={t('empty')} subtitle={L('You have not created any groups yet.', 'لم تنشئ أي مجموعات بعد.')} />
      ) : (
        <div className="space-y-2">
          {myGroups.map((g) => (
            <Card key={g.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-800">{g.name}</div>
                  <div className="text-xs text-slate-500">
                    {memberCount(g)} {L('members', 'أعضاء')}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => { setEditTarget(g); setFormOpen(true) }}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-gate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
                    aria-label={L('Edit', 'تعديل')}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(g)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                    aria-label={L('Delete', 'حذف')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {memberCount(g) > 0 && (
                <div className="mt-2">
                  <Badge tone="teal">{memberCount(g)} {L('members', 'أعضاء')}</Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <GroupFormSheet open={formOpen} onClose={() => setFormOpen(false)} group={editTarget} />

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800">{L('Delete group', 'حذف المجموعة')}</h2>
          <p className="text-sm text-slate-600">
            {L('Delete', 'حذف')} <span className="font-semibold text-slate-800">{deleteTarget?.name}</span>?{' '}
            {L('This cannot be undone.', 'لا يمكن التراجع عن هذا.')}
          </p>
          <div className="flex gap-2">
            <Button full variant="subtle" onClick={() => setDeleteTarget(null)}>
              {t('cancel')}
            </Button>
            <Button
              full
              variant="danger"
              onClick={() => {
                if (deleteTarget) removeGroup(deleteTarget.id)
                setDeleteTarget(null)
              }}
            >
              <Trash2 size={16} className="me-1.5" />
              {L('Delete', 'حذف')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
