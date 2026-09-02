import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  ChevronDown,
  Expand,
  Maximize2,
  Plus,
  Shrink,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useStore } from '@/store'
import { STRUCTURE_ROOT_CODE } from '@/types'
import type { StructureKind, StructureNode } from '@/types'
import { Button, Input, Modal, cx } from '@/ui/primitives'

// ── Layout constants ─────────────────────────────────────────────────────────
const NODE_W = 190
const NODE_H = 72
const H_GAP = 26
const V_GAP = 58
const FIT_PAD = 48
const MIN_SCALE = 0.3
const MAX_SCALE = 2

// Level accent palette — root is a gradient, deeper levels cycle brand hues.
const LEVEL_ACCENT = ['#2447d6', '#2447d6', '#0d9488', '#7c3aed', '#b45309', '#db2777']
const accentFor = (level: number) => LEVEL_ACCENT[Math.min(level, LEVEL_ACCENT.length - 1)]

interface TreeNode {
  node: StructureNode
  children: TreeNode[]
}
interface Placed {
  x: number
  y: number
}

/** Build a forest of TreeNodes from the flat node list. */
function buildForest(nodes: StructureNode[]): TreeNode[] {
  const byId = new Map<string, TreeNode>()
  nodes.forEach((n) => byId.set(n.id, { node: n, children: [] }))
  const roots: TreeNode[] = []
  nodes.forEach((n) => {
    const tn = byId.get(n.id)!
    const parent = n.parentId ? byId.get(n.parentId) : null
    if (parent && n.level > 0) parent.children.push(tn)
    else roots.push(tn)
  })
  return roots
}

/**
 * Tidy top-down layout. `x` is the node's left edge, `y` its top edge.
 * A parent is centered over the span of its (visible) children.
 */
function layout(roots: TreeNode[], collapsed: Set<string>) {
  const pos = new Map<string, Placed>()
  let cursorX = 0
  let maxBottom = 0

  const walk = (tn: TreeNode, depth: number) => {
    const y = depth * (NODE_H + V_GAP)
    maxBottom = Math.max(maxBottom, y + NODE_H)
    const kids = collapsed.has(tn.node.id) ? [] : tn.children
    if (kids.length === 0) {
      pos.set(tn.node.id, { x: cursorX, y })
      cursorX += NODE_W + H_GAP
      return
    }
    kids.forEach((k) => walk(k, depth + 1))
    const first = pos.get(kids[0].node.id)!.x
    const last = pos.get(kids[kids.length - 1].node.id)!.x
    pos.set(tn.node.id, { x: (first + last) / 2, y })
  }
  roots.forEach((r) => walk(r, 0))

  const width = Math.max(NODE_W, cursorX - H_GAP)
  const height = Math.max(NODE_H, maxBottom)
  return { pos, width, height }
}

/** Smooth vertical bezier connector from a parent's bottom-center to a child's top-center. */
function connectorPath(px: number, py: number, cxp: number, cy: number) {
  const startX = px + NODE_W / 2
  const startY = py + NODE_H
  const endX = cxp + NODE_W / 2
  const endY = cy
  const midY = startY + (endY - startY) / 2
  return `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
}

export function OrgChart({
  entityId,
  kind,
  nodes,
  L,
  rootLabel,
}: {
  entityId: string
  kind: StructureKind
  nodes: StructureNode[]
  L: (en: string, ar: string) => string
  rootLabel: string
}) {
  const addStructureNode = useStore((s) => s.addStructureNode)
  const removeStructureNode = useStore((s) => s.removeStructureNode)

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [view, setView] = useState({ tx: 0, ty: 0, scale: 1 })
  const [vp, setVp] = useState({ w: 0, h: 0 })
  const [panning, setPanning] = useState(false)
  const [addText, setAddText] = useState('')
  const [pendingDelete, setPendingDelete] = useState<StructureNode | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const viewportRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ active: boolean; moved: boolean; sx: number; sy: number; ox: number; oy: number }>({
    active: false,
    moved: false,
    sx: 0,
    sy: 0,
    ox: 0,
    oy: 0,
  })

  const roots = useMemo(() => buildForest(nodes), [nodes])
  const { pos, width, height } = useMemo(() => layout(roots, collapsed), [roots, collapsed])

  // parent lookup + descendant counts (over the FULL tree, ignoring collapse)
  const { parentOf, descCount, childCount } = useMemo(() => {
    const parentOf = new Map<string, string>()
    const childCount = new Map<string, number>()
    nodes.forEach((n) => {
      if (n.parentId && n.level > 0) {
        parentOf.set(n.id, n.parentId)
        childCount.set(n.parentId, (childCount.get(n.parentId) ?? 0) + 1)
      }
    })
    const descCount = new Map<string, number>()
    const countDesc = (tn: TreeNode): number => {
      let c = 0
      tn.children.forEach((k) => (c += 1 + countDesc(k)))
      descCount.set(tn.node.id, c)
      return c
    }
    roots.forEach(countDesc)
    return { parentOf, descCount, childCount }
  }, [nodes, roots])

  // ancestor chain of the active node → used to highlight the path to the root
  const activeId = hover ?? selected
  const pathSet = useMemo(() => {
    const set = new Set<string>()
    let cur = activeId
    while (cur) {
      set.add(cur)
      cur = parentOf.get(cur) ?? null
    }
    return set
  }, [activeId, parentOf])

  // ── Fit to viewport ──────────────────────────────────────────────────────
  const fit = (vw = vp.w, vh = vp.h) => {
    if (!vw || !vh) return
    const s = Math.max(
      MIN_SCALE,
      Math.min(1.4, (vw - 2 * FIT_PAD) / width, (vh - 2 * FIT_PAD) / height),
    )
    const tx = (vw - width * s) / 2
    const ty = height * s < vh - 2 * FIT_PAD ? (vh - height * s) / 2 : FIT_PAD
    setView({ tx, ty, scale: s })
  }

  // Fit using a freshly measured viewport rect (robust right after a layout
  // change like entering/leaving fullscreen, before the ResizeObserver fires).
  const fitToViewport = () => {
    const el = viewportRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    fit(r.width, r.height)
  }

  // measure viewport (the canvas is always rendered, so the ref is stable)
  useLayoutEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect
      setVp((prev) => (prev.w === r.width && prev.h === r.height ? prev : { w: r.width, h: r.height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Fit exactly once — the first time we have both a measured viewport and content.
  // Covers mount-with-content AND empty→populated (adding the first node), and
  // crucially does NOT run on later resizes, so user collapse/selection state survives.
  const fitted = useRef(false)
  useLayoutEffect(() => {
    if (fitted.current || !vp.w || !vp.h || nodes.length === 0) return
    fitted.current = true
    fit(vp.w, vp.h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.w, vp.h, nodes.length])

  // Re-fit across a fullscreen transition (the viewport size changes), and lock
  // body scroll while the overlay is open. Escape leaves fullscreen.
  useEffect(() => {
    const id = requestAnimationFrame(() => fitToViewport())
    if (!fullscreen) return () => cancelAnimationFrame(id)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pendingDelete) setFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(id)
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen])

  // ── Zoom around a viewport point ───────────────────────────────────────────
  const zoomAt = (factor: number, cxp: number, cyp: number) => {
    setView((v) => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor))
      const k = next / v.scale
      return { scale: next, tx: cxp - (cxp - v.tx) * k, ty: cyp - (cyp - v.ty) * k }
    })
  }
  const zoomButton = (factor: number) => zoomAt(factor, vp.w / 2, vp.h / 2)

  // Native, non-passive wheel listener so preventDefault actually suppresses page
  // scroll (React's synthetic onWheel is registered passive and cannot).
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      const cxp = e.clientX - rect.left
      const cyp = e.clientY - rect.top
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
      setView((v) => {
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor))
        const k = next / v.scale
        return { scale: next, tx: cxp - (cxp - v.tx) * k, ty: cyp - (cyp - v.ty) * k }
      })
    }
    el.addEventListener('wheel', onWheelNative, { passive: false })
    return () => el.removeEventListener('wheel', onWheelNative)
  }, [])

  // ── Pan ────────────────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    drag.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: view.tx, oy: view.ty }
    setPanning(true)
    viewportRef.current?.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.sx
    const dy = e.clientY - drag.current.sy
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true
    setView((v) => ({ ...v, tx: drag.current.ox + dx, ty: drag.current.oy + dy }))
  }
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current.active = false
    setPanning(false)
    viewportRef.current?.releasePointerCapture(e.pointerId)
  }
  // Deselect only when the click lands on empty canvas (node clicks stopPropagation)
  // and it was not the tail of a pan gesture.
  const onCanvasClick = () => {
    if (!drag.current.moved) setSelected(null)
  }

  // ── Mutations ────────────────────────────────────────────────────────────
  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const ensureRoot = (): string => {
    const r = nodes.find((n) => n.level === 0)
    if (r) return r.id
    return addStructureNode({ entityId, kind, code: STRUCTURE_ROOT_CODE[kind], name: kind, level: 0, parentId: null })
  }

  // Unique, node-distinguishing code: next value above the highest in this structure.
  const nextCode = () => nodes.reduce((m, n) => Math.max(m, n.code), STRUCTURE_ROOT_CODE[kind]) + 1

  const selectedNode = selected ? nodes.find((n) => n.id === selected) : null
  const addChild = () => {
    const text = addText.trim()
    if (!text) return
    const parentLevel = selectedNode ? selectedNode.level : 0
    const parentId = selectedNode ? selectedNode.id : ensureRoot()
    const level = parentLevel + 1
    const id = addStructureNode({ entityId, kind, code: nextCode(), name: text, level, parentId })
    setAddText('')
    // make sure the new child is visible
    if (selected) setCollapsed((prev) => {
      const next = new Set(prev)
      next.delete(selected)
      return next
    })
    setSelected(id)
  }

  const toggleSelect = (id: string) => setSelected((s) => (s === id ? null : id))

  const confirmDelete = () => {
    if (!pendingDelete) return
    const id = pendingDelete.id
    removeStructureNode(id)
    if (selected === id) setSelected(null)
    setPendingDelete(null)
  }

  const edges: { from: StructureNode; to: StructureNode }[] = []
  nodes.forEach((n) => {
    if (n.parentId && n.level > 0 && pos.has(n.id) && pos.has(n.parentId) && !collapsed.has(n.parentId)) {
      const parent = nodes.find((p) => p.id === n.parentId)
      if (parent) edges.push({ from: parent, to: n })
    }
  })

  const pendingDesc = pendingDelete ? descCount.get(pendingDelete.id) ?? 0 : 0

  return (
    <div
      className={cx(
        fullscreen
          ? 'fixed inset-0 z-50 flex flex-col gap-2 bg-slate-100 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] animate-fade-in'
          : 'space-y-2',
      )}
    >
      {fullscreen && (
        <div className="flex shrink-0 items-center justify-between px-1">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gate-600 text-light">
              <Building2 size={15} />
            </span>
            {rootLabel}
          </div>
          <button
            onClick={() => setFullscreen(false)}
            aria-label={L('Exit fullscreen', 'إنهاء ملء الشاشة')}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
          >
            <Shrink size={14} /> {L('Exit', 'إنهاء')}
          </button>
        </div>
      )}
      {/* Canvas — always rendered so the viewport ref/observer stay attached */}
      <div
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onCanvasClick}
        className={cx(
          'relative w-full touch-none select-none overflow-hidden border border-slate-200 bg-slate-50',
          fullscreen ? 'min-h-0 flex-1 rounded-2xl' : 'h-[62vh] min-h-[380px] rounded-2xl',
        )}
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.35) 1px, transparent 1px)',
          backgroundSize: `${22 * view.scale}px ${22 * view.scale}px`,
          backgroundPosition: `${view.tx}px ${view.ty}px`,
          cursor: panning ? 'grabbing' : 'grab',
        }}
      >
        {/* Enter-fullscreen — always available (even before the first node) */}
        {!fullscreen && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setFullscreen(true)
            }}
            aria-label={L('Fullscreen', 'ملء الشاشة')}
            title={L('Fullscreen', 'ملء الشاشة')}
            className="absolute end-3 top-3 z-10 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gate-700 shadow-sm transition hover:bg-gate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
          >
            <Expand size={14} /> {L('Fullscreen', 'ملء الشاشة')}
          </button>
        )}
        {nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Building2 size={26} />
            </div>
            <p className="text-sm font-medium text-slate-500">{L('No structure yet', 'لا يوجد هيكل بعد')}</p>
            <p className="text-xs text-slate-400">{L('Add the first node below.', 'أضف أول عقدة بالأسفل.')}</p>
          </div>
        ) : (
          <>
            {/* World */}
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`, width, height }}
            >
              {/* Connectors */}
              <svg
                className="pointer-events-none absolute left-0 top-0 overflow-visible"
                width={width}
                height={height}
                fill="none"
              >
                {edges.map(({ from, to }) => {
                  const p = pos.get(from.id)!
                  const c = pos.get(to.id)!
                  const hot = pathSet.has(to.id) && pathSet.has(from.id)
                  return (
                    <path
                      key={to.id}
                      d={connectorPath(p.x, p.y, c.x, c.y)}
                      stroke={hot ? '#2447d6' : '#cbd5e1'}
                      strokeWidth={hot ? 2.5 : 1.5}
                      strokeLinecap="round"
                      className="transition-[stroke,stroke-width] duration-150"
                    />
                  )
                })}
              </svg>

              {/* Nodes */}
              {nodes.map((n) => {
                const p = pos.get(n.id)
                if (!p) return null
                const isRoot = n.level === 0
                const accent = accentFor(n.level)
                const kids = childCount.get(n.id) ?? 0
                const isCollapsed = collapsed.has(n.id)
                const onPath = pathSet.has(n.id)
                const isSelected = selected === n.id
                const label = isRoot ? rootLabel : n.name
                return (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-pressed={isSelected}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover((h) => (h === n.id ? null : h))}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (drag.current.moved) return
                      toggleSelect(n.id)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggleSelect(n.id)
                      }
                    }}
                    className={cx(
                      'group absolute flex cursor-pointer flex-col justify-center rounded-2xl border bg-white px-3 shadow-card transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400',
                      isSelected ? 'border-gate-500 ring-2 ring-gate-500/30' : onPath ? 'border-gate-200' : 'border-slate-200',
                      'hover:shadow-card-hover',
                    )}
                    style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H, background: isRoot ? accent : undefined }}
                  >
                    {/* accent bar (non-root) */}
                    {!isRoot && (
                      <span className="absolute inset-y-2 start-0 w-1 rounded-full" style={{ background: accent }} />
                    )}

                    <div className="flex items-center gap-2 ps-1.5">
                      {isRoot && (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-light/20 text-light">
                          <Building2 size={16} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div
                          className={cx('font-mono text-[10px]', isRoot ? 'text-light/70' : 'text-gate-700')}
                          dir="ltr"
                        >
                          {n.code}
                        </div>
                        <div
                          className={cx('truncate text-[13px] font-semibold leading-tight', isRoot ? 'text-light' : 'text-slate-800')}
                        >
                          {label}
                        </div>
                      </div>
                    </div>

                    {/* actions — revealed on hover, keyboard focus, or selection (touch) */}
                    <div
                      className={cx(
                        'absolute -top-3 end-2 flex items-center gap-1 transition-opacity',
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                      )}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelected(n.id)
                          setAddText('')
                          document.getElementById('orgchart-add')?.focus()
                        }}
                        tabIndex={isSelected ? 0 : -1}
                        aria-label={L('Add child', 'إضافة فرع')}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-gate-600 shadow-sm hover:bg-gate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
                        title={L('Add child', 'إضافة فرع')}
                      >
                        <Plus size={13} />
                      </button>
                      {!isRoot && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPendingDelete(n)
                          }}
                          tabIndex={isSelected ? 0 : -1}
                          aria-label={L('Delete', 'حذف')}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-rose-500 shadow-sm hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                          title={L('Delete', 'حذف')}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    {/* collapse toggle */}
                    {kids > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleCollapse(n.id)
                        }}
                        aria-label={isCollapsed ? L('Expand', 'توسيع') : L('Collapse', 'طي')}
                        className={cx(
                          'absolute -bottom-3 left-1/2 flex h-6 min-w-6 -translate-x-1/2 items-center justify-center gap-0.5 rounded-full border px-1 text-[10px] font-bold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400',
                          isCollapsed ? 'border-gate-200 bg-gate-600 text-light' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50',
                        )}
                        title={isCollapsed ? L('Expand', 'توسيع') : L('Collapse', 'طي')}
                      >
                        {isCollapsed ? (
                          <span className="px-0.5">{descCount.get(n.id)}</span>
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-3 end-3 flex flex-col gap-1.5">
              <ControlBtn onClick={() => zoomButton(1.2)} title={L('Zoom in', 'تكبير')}>
                <ZoomIn size={16} />
              </ControlBtn>
              <ControlBtn onClick={() => zoomButton(1 / 1.2)} title={L('Zoom out', 'تصغير')}>
                <ZoomOut size={16} />
              </ControlBtn>
              <ControlBtn onClick={() => fitToViewport()} title={L('Fit', 'ملاءمة')}>
                <Maximize2 size={16} />
              </ControlBtn>
            </div>

            {/* Zoom level pill */}
            <div className="absolute bottom-3 start-3 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-500 backdrop-blur">
              {Math.round(view.scale * 100)}%
            </div>
          </>
        )}
      </div>

      {/* Add bar */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {selectedNode ? (
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
              {L('Add under', 'إضافة ضمن')}
              <span className="max-w-[10rem] truncate rounded-full bg-gate-50 px-2 py-0.5 font-semibold text-gate-700">
                {selectedNode.level === 0 ? rootLabel : selectedNode.name}
              </span>
              <button
                onClick={() => setSelected(null)}
                aria-label={L('Clear selection', 'إلغاء التحديد')}
                className="rounded-full p-0.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={13} />
              </button>
            </span>
          ) : (
            <span className="shrink-0 text-xs text-slate-400">{L('Add top-level', 'إضافة مستوى أول')}</span>
          )}
          <Input
            id="orgchart-add"
            value={addText}
            onChange={(e) => setAddText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addChild()}
            placeholder={L('Node name…', 'اسم العقدة…')}
            className="flex-1"
          />
        </div>
        <Button size="sm" variant="secondary" onClick={addChild} disabled={!addText.trim()}>
          <Plus size={14} />
        </Button>
      </div>

      {/* Delete confirmation */}
      <Modal open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        <div className="space-y-4">
          <h2 className="text-base font-bold text-slate-800">{L('Delete node', 'حذف العقدة')}</h2>
          <p className="text-sm text-slate-600">
            {L('Delete', 'حذف')}{' '}
            <span className="font-semibold text-slate-800">
              {pendingDelete?.level === 0 ? rootLabel : pendingDelete?.name}
            </span>
            ?{' '}
            {pendingDesc > 0 &&
              L(
                `This also removes ${pendingDesc} node${pendingDesc === 1 ? '' : 's'} beneath it. `,
                `سيؤدي هذا أيضًا إلى إزالة ${pendingDesc} عقدة تابعة. `,
              )}
            {L('This cannot be undone.', 'لا يمكن التراجع عن هذا.')}
          </p>
          <div className="flex gap-2">
            <Button full variant="subtle" onClick={() => setPendingDelete(null)}>
              {L('Cancel', 'إلغاء')}
            </Button>
            <Button full variant="danger" onClick={confirmDelete}>
              <Trash2 size={16} className="me-1.5" /> {L('Delete', 'حذف')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function ControlBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400"
    >
      {children}
    </button>
  )
}
