import { useMemo, useRef, useState } from 'react'
import { X, UsersRound, User, Search } from 'lucide-react'
import type { ActorRef } from '@/types'
import { actorKey } from '@/lib/identity'
import { cx } from '@/ui/primitives'

export interface PickerGroup {
  id: string
  name: string
  count: number
}

/**
 * A searchable typeahead that selects PEOPLE and GROUPS together.
 * Purely controlled: the parent owns `refs` (person/virtual actor refs) and
 * `groupIds`, and expands groups to concrete recipients at send time via the
 * store's `groupRecipients`.
 */
export function RecipientPicker({
  label,
  required,
  options,
  groups,
  refs,
  groupIds,
  onChangeRefs,
  onChangeGroupIds,
  resolveName,
  resolveLabel,
  placeholder,
  isRtl,
}: {
  label: string
  required?: boolean
  options: ActorRef[]
  groups: PickerGroup[]
  refs: ActorRef[]
  groupIds: string[]
  onChangeRefs: (next: ActorRef[]) => void
  onChangeGroupIds: (next: string[]) => void
  resolveName: (r: ActorRef) => string
  resolveLabel: (r: ActorRef) => string
  placeholder?: string
  isRtl: boolean
}) {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const selectedKeys = useMemo(() => new Set(refs.map(actorKey)), [refs])
  const selectedGroups = useMemo(() => new Set(groupIds), [groupIds])

  const q = query.trim().toLowerCase()
  const matchingPeople = useMemo(
    () =>
      options
        .filter((r) => !selectedKeys.has(actorKey(r)))
        .filter((r) => !q || resolveLabel(r).toLowerCase().includes(q))
        .slice(0, 8),
    [options, selectedKeys, q, resolveLabel],
  )
  const matchingGroups = useMemo(
    () =>
      groups
        .filter((g) => !selectedGroups.has(g.id))
        .filter((g) => !q || g.name.toLowerCase().includes(q))
        .slice(0, 6),
    [groups, selectedGroups, q],
  )

  const addRef = (r: ActorRef) => {
    onChangeRefs([...refs, r])
    setQuery('')
  }
  const removeRef = (k: string) => onChangeRefs(refs.filter((r) => actorKey(r) !== k))
  const addGroup = (id: string) => {
    onChangeGroupIds([...groupIds, id])
    setQuery('')
  }
  const removeGroup = (id: string) => onChangeGroupIds(groupIds.filter((g) => g !== id))

  const hasChips = refs.length > 0 || groupIds.length > 0
  const showList = focused && (matchingPeople.length > 0 || matchingGroups.length > 0)

  return (
    <label className="block">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="text-xs font-semibold text-slate-700">{label}</span>
        {required && <span className="text-rose-500">*</span>}
      </div>

      {hasChips && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {groupIds.map((id) => {
            const g = groups.find((x) => x.id === id)
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-teal-50 py-1 ps-2.5 pe-1 text-xs font-medium text-teal-700"
              >
                <UsersRound size={12} />
                {g?.name ?? id}
                {g && <span className="text-teal-400">· {g.count}</span>}
                <button
                  type="button"
                  onClick={() => removeGroup(id)}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-teal-400 transition hover:bg-teal-200 hover:text-teal-700"
                  aria-label={isRtl ? 'إزالة' : 'Remove'}
                >
                  <X size={12} />
                </button>
              </span>
            )
          })}
          {refs.map((r) => (
            <span
              key={actorKey(r)}
              className="inline-flex items-center gap-1 rounded-full bg-gate-50 py-1 ps-2.5 pe-1 text-xs font-medium text-gate-700"
            >
              <User size={12} />
              {resolveName(r)}
              <button
                type="button"
                onClick={() => removeRef(actorKey(r))}
                className="flex h-4 w-4 items-center justify-center rounded-full text-gate-400 transition hover:bg-gate-200 hover:text-gate-700"
                aria-label={isRtl ? 'إزالة' : 'Remove'}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={15} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (blurTimer.current) clearTimeout(blurTimer.current)
            setFocused(true)
          }}
          onBlur={() => {
            blurTimer.current = setTimeout(() => setFocused(false), 150)
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 py-2.5 ps-9 pe-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-gate-400 focus:bg-white focus:ring-2 focus:ring-gate-100"
        />

        {showList && (
          <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto thin-scroll rounded-2xl border border-slate-200 bg-white py-1 shadow-lg">
            {matchingGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addGroup(g.id)}
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-slate-700 transition hover:bg-teal-50"
              >
                <UsersRound size={15} className="shrink-0 text-teal-500" />
                <span className="min-w-0 flex-1 truncate">{g.name}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{g.count}</span>
              </button>
            ))}
            {matchingPeople.map((r) => (
              <button
                key={actorKey(r)}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addRef(r)}
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-slate-700 transition hover:bg-gate-50"
              >
                <User size={15} className="shrink-0 text-gate-500" />
                <span className="min-w-0 flex-1 truncate">{resolveLabel(r)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  )
}
