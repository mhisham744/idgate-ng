import { useEffect, useMemo, useState } from 'react'
import { Search, ChevronDown } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { TRANSACTIONS, PROFILE_GRANTABLE, txLabel, APP_AREA_LABELS } from '@/data/reference'
import type { AppArea, PermissionSet, Profile, TransactionKey } from '@/types'
import { Button, Field, Input, Sheet, Toggle, cx } from '@/ui/primitives'

const FULL: PermissionSet = { create: true, change: true, display: true, delete: true }

// Group grantable transactions by app area; admin.* keys fall under "Admin".
const AREA_OF: Partial<Record<TransactionKey, AppArea>> = Object.fromEntries(
  TRANSACTIONS.map((t) => [t.key, t.area]),
) as Partial<Record<TransactionKey, AppArea>>

const GROUP_ORDER: (AppArea | 'admin')[] = ['home', 'messages', 'notification', 'tools', 'settings', 'admin']

/**
 * Create / edit an authorization profile: a name plus a per-transaction
 * activate/deactivate list. An enabled transaction is granted full CRUD.
 */
export function ProfileEditor({
  open,
  onClose,
  entityId,
  profile,
}: {
  open: boolean
  onClose: () => void
  entityId: string
  profile?: Profile | null
}) {
  const { lang, t, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const addProfile = useStore((s) => s.addProfile)
  const updateProfile = useStore((s) => s.updateProfile)

  const editing = !!profile
  const [name, setName] = useState('')
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    setName(profile?.name ?? '')
    setEnabled(new Set(profile ? Object.keys(profile.permissions) : []))
    setQuery('')
    setCollapsed(new Set())
  }, [open, profile])

  const toggle = (key: string) =>
    setEnabled((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const toggleCollapse = (g: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })

  // Grant / clear every transaction in a group at once (tree-level action).
  const setGroup = (keys: TransactionKey[], on: boolean) =>
    setEnabled((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => (on ? next.add(k) : next.delete(k)))
      return next
    })

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const byGroup = new Map<AppArea | 'admin', TransactionKey[]>()
    for (const key of PROFILE_GRANTABLE) {
      const label = bl(txLabel(key), lang).toLowerCase()
      if (q && !label.includes(q)) continue
      const g = (AREA_OF[key] ?? 'admin') as AppArea | 'admin'
      const arr = byGroup.get(g) ?? []
      arr.push(key)
      byGroup.set(g, arr)
    }
    return GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => ({ group: g, keys: byGroup.get(g)! }))
  }, [query, lang])

  const groupLabel = (g: AppArea | 'admin') =>
    g === 'admin' ? L('Administration', 'الإدارة') : bl(APP_AREA_LABELS[g], lang)

  const save = () => {
    if (!name.trim()) return
    const permissions: Partial<Record<TransactionKey, PermissionSet>> = {}
    // Preserve the existing granular level for transactions that were already
    // granted; grant full CRUD only to newly-enabled ones (no silent escalation).
    enabled.forEach((k) => {
      const key = k as TransactionKey
      const prior = profile?.permissions[key]
      permissions[key] = prior ? { ...prior } : { ...FULL }
    })
    if (editing && profile) updateProfile(profile.id, { name: name.trim(), permissions })
    else addProfile({ entityId, name: name.trim(), permissions })
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? L('Edit profile', 'تعديل البروفايل') : L('New profile', 'بروفايل جديد')}
      footer={
        <Button full onClick={save} disabled={!name.trim()}>
          {editing ? L('Save changes', 'حفظ التغييرات') : t('create')}
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label={L('Profile name', 'اسم البروفايل')} required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('e.g. Manager', 'مثال: مدير')} />
        </Field>

        <div className="relative">
          <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L('Search transactions…', 'ابحث عن معاملة…')} className="ps-9" />
        </div>

        <div className="text-xs text-slate-500">
          {enabled.size} {L('enabled', 'مفعّلة')}
        </div>

        {groups.map(({ group, keys }) => {
          const onCount = keys.filter((k) => enabled.has(k)).length
          const allOn = onCount === keys.length
          const isCollapsed = collapsed.has(group)
          return (
            <div key={group} className="space-y-1">
              <div className="flex items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={() => toggleCollapse(group)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400"
                >
                  <ChevronDown size={13} className={cx('shrink-0 transition', isCollapsed && '-rotate-90')} />
                  <span className="truncate">{groupLabel(group)}</span>
                  <span className={cx('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', onCount > 0 ? 'bg-gate-100 text-gate-700' : 'bg-slate-100 text-slate-400')}>
                    {onCount}/{keys.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setGroup(keys, !allOn)}
                  className="shrink-0 text-[11px] font-semibold text-gate-600"
                >
                  {allOn ? L('Clear', 'مسح') : L('Select all', 'تحديد الكل')}
                </button>
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden rounded-2xl border border-slate-100">
                  {keys.map((key) => {
                    const on = enabled.has(key)
                    return (
                      <div key={key} className={cx('flex items-center justify-between gap-2 px-3 py-2', on && 'bg-gate-50/50')}>
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{bl(txLabel(key), lang)}</span>
                        <Toggle checked={on} onChange={() => toggle(key)} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
