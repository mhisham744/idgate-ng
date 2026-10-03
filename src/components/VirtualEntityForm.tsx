import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { STRUCTURE_LABELS } from '@/data/reference'
import type { StructureKind } from '@/types'
import { useResolveActor } from '@/components/identity'
import { Button, Field, Select } from '@/ui/primitives'

const STRUCTURE_KINDS = Object.keys(STRUCTURE_LABELS) as StructureKind[]

/**
 * Create/edit form for a virtual entity. Self-contained: reads the entity's
 * positions, profiles and structure nodes from the store (like StructureEditor),
 * and writes via addVirtual / updateVirtual. Reused by the org wizard (Step 6)
 * and EntityManage (Virtual Entity tab).
 */
export function VirtualEntityForm({
  entityId,
  virtualId,
  onDone,
}: {
  entityId: string
  virtualId?: string
  onDone?: () => void
}) {
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const positionsAll = useStore((s) => s.positions)
  const profilesAll = useStore((s) => s.profiles)
  const structuresAll = useStore((s) => s.structures)
  const addVirtual = useStore((s) => s.addVirtual)
  const updateVirtual = useStore((s) => s.updateVirtual)
  const existing = useStore((s) => (virtualId ? s.virtuals.find((v) => v.id === virtualId) : undefined))

  const positions = useMemo(() => positionsAll.filter((p) => p.entityId === entityId), [positionsAll, entityId])
  const profiles = useMemo(() => profilesAll.filter((p) => p.entityId === entityId), [profilesAll, entityId])
  const structures = useMemo(() => structuresAll.filter((n) => n.entityId === entityId && n.level > 0), [structuresAll, entityId])

  const [posId, setPosId] = useState(existing?.positionId ?? '')
  const [profId, setProfId] = useState(existing?.profileIds[0] ?? '')
  const [nodes, setNodes] = useState<Partial<Record<StructureKind, string>>>(() => ({ ...(existing?.structure ?? {}) }))

  const save = () => {
    const pos = positions.find((p) => p.id === posId)
    if (!pos) return
    const structure = {
      corporate: nodes.corporate,
      relation: nodes.relation,
      organization: nodes.organization,
      geographical: nodes.geographical,
    }
    if (virtualId && existing) {
      // Preserve all other fields (links/delegation/duration/status/etc.).
      updateVirtual(virtualId, {
        positionId: pos.id,
        positionName: pos.name,
        profileIds: profId ? [profId] : [],
        structure,
      })
    } else {
      addVirtual({
        entityId,
        positionId: pos.id,
        positionName: pos.name,
        structure,
        profileIds: profId ? [profId] : [],
        delegationSubjects: [],
        delegationLimits: [],
        delegationDisplay: true,
        delegateOthers: false,
        duration: { open: true },
        displayHistory: true,
        location: 'contacts',
        linkedNormalId: null,
      })
    }
    onDone?.()
  }

  if (positions.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        {L('Add positions first.', 'أضف وظائف أولًا.')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <Field label={t('positions')} required>
        <Select value={posId} onChange={(e) => setPosId(e.target.value)}>
          <option value="">—</option>
          {positions.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>
      <Field label={L('Profile', 'البروفايل')} required>
        <Select value={profId} onChange={(e) => setProfId(e.target.value)}>
          <option value="">—</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>
      {profiles.length === 0 && (
        <p className="text-xs text-amber-600">{L('Create an authorization profile first.', 'أنشئ بروفايل صلاحيات أولًا.')}</p>
      )}
      {STRUCTURE_KINDS.map((kind) => {
        const opts = structures.filter((n) => n.kind === kind)
        if (opts.length === 0) return null
        return (
          <Field key={kind} label={bl(STRUCTURE_LABELS[kind], lang)}>
            <Select value={nodes[kind] ?? ''} onChange={(e) => setNodes((n) => ({ ...n, [kind]: e.target.value || undefined }))}>
              <option value="">—</option>
              {opts.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </Select>
          </Field>
        )
      })}
      <Button full variant="secondary" disabled={!posId || !profId} onClick={save}>
        {virtualId ? t('save') : <><Plus size={14} /> {t('addVirtualEntity')}</>}
      </Button>
    </div>
  )
}

/** Read-only detail of a virtual entity — reused for the "Display" action. */
export function VirtualEntityDetail({ virtualId }: { virtualId: string }) {
  const { lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)
  const resolve = useResolveActor()

  const v = useStore((s) => s.virtuals.find((x) => x.id === virtualId))
  const profilesAll = useStore((s) => s.profiles)
  const structuresAll = useStore((s) => s.structures)

  if (!v) return null
  const r = resolve({ kind: 'virtual', virtualId })

  const nodeName = (kind: StructureKind) => {
    const nodeId = v.structure[kind]
    return nodeId ? structuresAll.find((n) => n.id === nodeId)?.name ?? '—' : '—'
  }
  const profileNames = v.profileIds
    .map((pid) => profilesAll.find((p) => p.id === pid)?.name)
    .filter(Boolean)
    .join('، ')

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: L('Position', 'الوظيفة'), value: v.positionName },
    { label: L('Profile', 'البروفايل'), value: profileNames || '—' },
    ...STRUCTURE_KINDS.map((kind) => ({ label: bl(STRUCTURE_LABELS[kind], lang), value: nodeName(kind) })),
    { label: L('Position code', 'كود المنصب'), value: v.positionCode || '—', mono: true },
    { label: L('Additional codes', 'أكواد إضافية'), value: (v.additionalCodes && v.additionalCodes.length > 0) ? v.additionalCodes.join(', ') : '—', mono: true },
    { label: L('Address', 'العنوان'), value: r.address || '—', mono: true },
  ]

  return (
    <div className="space-y-1.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
          <span className="shrink-0 text-xs font-semibold text-slate-500">{row.label}</span>
          <span
            dir={row.mono ? 'ltr' : undefined}
            className={row.mono ? 'min-w-0 truncate text-end font-address text-xs text-gate-700' : 'min-w-0 truncate text-end text-sm text-slate-800'}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  )
}
