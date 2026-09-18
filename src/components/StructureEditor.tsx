import { useState } from 'react'
import { Layers, Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { useStore } from '@/store'
import { bl } from '@/i18n'
import { STRUCTURE_LABELS } from '@/data/reference'
import { STRUCTURE_ROOT_CODE } from '@/types'
import type { StructureKind, StructureNode } from '@/types'
import { Button, Card, Input } from '@/ui/primitives'

/**
 * Inline structure editor for one StructureKind: renders the node tree with
 * add-child (any depth), rename, and cascade delete. Reads/writes the store
 * directly. Reused by EntityManage (post-creation) and the org wizard (Step 3).
 */
export function StructureEditor({
  L,
  lang,
  kind,
  entityId,
  nodes,
}: {
  L: (en: string, ar: string) => string
  lang: 'en' | 'ar'
  kind: StructureKind
  entityId: string
  nodes: StructureNode[]
}) {
  const addStructureNode = useStore((s) => s.addStructureNode)
  const removeStructureNode = useStore((s) => s.removeStructureNode)
  const renameStructureNode = useStore((s) => s.renameStructureNode)

  const [addParent, setAddParent] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const roots = nodes.filter((n) => n.parentId === null || n.level === 0)
  const childrenOf = (pid: string) => nodes.filter((n) => n.parentId === pid)

  const ensureRoot = (): string => {
    const r = nodes.find((n) => n.level === 0)
    if (r) return r.id
    return addStructureNode({ entityId, kind, code: STRUCTURE_ROOT_CODE[kind], name: kind, level: 0, parentId: null })
  }

  // Unique, node-distinguishing code: next value above the highest in this structure.
  const nextCode = () => nodes.reduce((m, n) => Math.max(m, n.code), STRUCTURE_ROOT_CODE[kind]) + 1

  const submitAdd = (parentId: string | null, level: number) => {
    if (!text.trim()) return
    const pid = parentId ?? ensureRoot()
    addStructureNode({ entityId, kind, code: nextCode(), name: text.trim(), level, parentId: pid })
    setText('')
    setAddParent(null)
  }

  const submitRename = () => {
    if (editId && editText.trim()) renameStructureNode(editId, editText.trim())
    setEditId(null)
    setEditText('')
  }

  const renderNode = (n: StructureNode) => (
    <div key={n.id}>
      <div className="flex items-center gap-2 py-1" style={{ paddingInlineStart: n.level * 14 }}>
        <span className="font-mono text-[10px] text-gate-700" dir="ltr">{n.code}</span>
        {editId === n.id ? (
          <>
            <Input value={editText} onChange={(e) => setEditText(e.target.value)} className="h-7 flex-1 py-0" />
            <button onClick={submitRename} className="rounded-full p-1 text-emerald-500 hover:bg-emerald-50">
              <Check size={13} />
            </button>
            <button onClick={() => setEditId(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <span className="flex-1 truncate text-xs text-slate-700">
              {n.level === 0 ? bl(STRUCTURE_LABELS[kind], lang) : n.name}
            </span>
            <button onClick={() => setAddParent(addParent === n.id ? null : n.id)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label={L('Add child', 'إضافة فرع')}>
              <Plus size={13} />
            </button>
            {n.level > 0 && (
              <>
                <button onClick={() => { setEditId(n.id); setEditText(n.name) }} className="rounded-full p-1 text-slate-400 hover:bg-slate-100" aria-label={L('Rename', 'إعادة تسمية')}>
                  <Pencil size={12} />
                </button>
                <button onClick={() => removeStructureNode(n.id)} className="rounded-full p-1 text-rose-400 hover:bg-rose-50" aria-label={L('Delete', 'حذف')}>
                  <Trash2 size={13} />
                </button>
              </>
            )}
          </>
        )}
      </div>
      {addParent === n.id && (
        <div className="flex items-center gap-2 py-1" style={{ paddingInlineStart: (n.level + 1) * 14 }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={L('Child node…', 'عقدة فرعية…')} />
          <Button size="sm" variant="secondary" onClick={() => submitAdd(n.id, n.level + 1)}>
            <Plus size={14} />
          </Button>
        </div>
      )}
      {childrenOf(n.id).map(renderNode)}
    </div>
  )

  return (
    <Card className="p-4 space-y-1.5">
      <div className="flex items-center gap-2">
        <Layers size={16} className="text-gate-600" />
        <h3 className="flex-1 text-sm font-bold text-slate-800">{bl(STRUCTURE_LABELS[kind], lang)}</h3>
      </div>
      {roots.length === 0 && nodes.length === 0 ? (
        <p className="text-[11px] text-slate-400">{L('No nodes yet.', 'لا توجد عقد بعد.')}</p>
      ) : (
        roots.map(renderNode)
      )}
      <div className="flex items-center gap-2 pt-1">
        <Input
          value={addParent === null ? text : ''}
          onChange={(e) => { setAddParent(null); setText(e.target.value) }}
          placeholder={L('Add level-1 node…', 'إضافة عقدة مستوى ١…')}
        />
        <Button size="sm" variant="secondary" onClick={() => submitAdd(null, 1)}>
          <Plus size={14} />
        </Button>
      </div>
    </Card>
  )
}
