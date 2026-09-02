import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  Briefcase,
  Building2,
  CheckCircle2,
  Layers,
  Link2,
  Plus,
  Shield,
  Trash2,
  Unlink,
  Users,
  UsersRound,
} from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import {
  ORG_TYPE_LABELS,
  LEGAL_TYPE_LABELS,
  STRUCTURE_LABELS,
  INDUSTRY_LABELS,
  txLabel,
} from '@/data/reference'
import { STRUCTURE_ROOT_CODE } from '@/types'
import type { Ability } from '@/store'
import type { Profile, StructureKind, StructureNode, VirtualCharacter } from '@/types'
import { useResolveActor } from '@/components/identity'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  Row,
  Sheet,
} from '@/ui/primitives'

type Tab = 'structures' | 'profiles' | 'positions' | 'virtuals' | 'delegations' | 'groups'
const STRUCTURE_KINDS = Object.keys(STRUCTURE_LABELS) as StructureKind[]
const ABILITIES: Ability[] = ['create', 'change', 'display', 'delete']

export function EntityManage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const entity = useStore((s) => s.entity)
  const activateEntity = useStore((s) => s.activateEntity)
  const structures = useStore((s) => s.structures)
  const profiles = useStore((s) => s.profiles)
  const positions = useStore((s) => s.positions)
  const virtuals = useStore((s) => s.virtuals)
  const delegations = useStore((s) => s.delegations)
  const groups = useStore((s) => s.groups)
  const normals = useStore((s) => s.normals)

  const addStructureNode = useStore((s) => s.addStructureNode)
  const removeStructureNode = useStore((s) => s.removeStructureNode)
  const addPosition = useStore((s) => s.addPosition)
  const addDelegation = useStore((s) => s.addDelegation)
  const createLinkRequest = useStore((s) => s.createLinkRequest)
  const linkVirtual = useStore((s) => s.linkVirtual)
  const unlinkVirtual = useStore((s) => s.unlinkVirtual)
  const blockVirtual = useStore((s) => s.blockVirtual)

  const [tab, setTab] = useState<Tab>('structures')
  const [profileSheet, setProfileSheet] = useState<Profile | null>(null)
  const [linkTarget, setLinkTarget] = useState<VirtualCharacter | null>(null)

  const ent = id ? entity(id) : undefined

  if (!ent || !id) {
    return (
      <div className="p-4 space-y-4 pb-8">
        <EmptyState icon={<Building2 size={40} />} title={L('Organization not found', 'المؤسسة غير موجودة')} />
        <Button full variant="subtle" onClick={() => navigate('/settings/entities')}>
          <ArrowLeft size={16} className="rtl:rotate-180" /> {t('myEntities')}
        </Button>
      </div>
    )
  }

  const entStructures = structures.filter((n) => n.entityId === id)
  const entProfiles = profiles.filter((p) => p.entityId === id)
  const entPositions = positions.filter((p) => p.entityId === id)
  const entVirtuals = virtuals.filter((v) => v.entityId === id)
  const entDelegations = delegations.filter((d) => d.entityId === id)
  const entGroups = groups.filter((g) => g.entityId === id)

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: 'structures', label: t('communicationStructure'), n: entStructures.length },
    { key: 'profiles', label: t('authorization'), n: entProfiles.length },
    { key: 'positions', label: t('positions'), n: entPositions.length },
    { key: 'virtuals', label: t('virtualAccountsMd'), n: entVirtuals.length },
    { key: 'delegations', label: L('Delegations', 'التفويضات'), n: entDelegations.length },
    { key: 'groups', label: t('groups'), n: entGroups.length },
  ]

  return (
    <div className="p-4 space-y-4 pb-8">
      <button onClick={() => navigate('/settings/entities')} className="inline-flex items-center gap-1 text-xs font-medium text-gate-600">
        <ArrowLeft size={14} className="rtl:rotate-180" /> {t('myEntities')}
      </button>

      {/* header */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Avatar name={ent.commercialName} color={ent.logoColor} size={48} square icon={<Building2 size={22} />} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-slate-800">{ent.commercialName}</div>
            <div className="truncate font-mono text-[11px] text-gate-600" dir="ltr">
              {ent.domain}.{ent.orgType}.{ent.legalEntityType}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone={ent.status === 'active' ? 'green' : 'amber'}>
            {ent.status === 'active' ? t('entityStatusActive') : ent.status === 'pending' ? t('entityStatusPending') : t('entityStatusDraft')}
          </Badge>
          <Badge tone="gate">{bl(ORG_TYPE_LABELS[ent.orgType], lang)}</Badge>
          <Badge tone="slate">{bl(LEGAL_TYPE_LABELS[ent.legalEntityType], lang)}</Badge>
          <Badge tone="teal">{bl(INDUSTRY_LABELS[ent.mainIndustry], lang)}</Badge>
        </div>
        {ent.status !== 'active' && (
          <Button full className="mt-3" onClick={() => activateEntity(id)}>
            <CheckCircle2 size={16} /> {t('activate')}
          </Button>
        )}
      </Card>

      {/* tab bar */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 thin-scroll">
        {tabs.map((tb) => (
          <Chip key={tb.key} active={tab === tb.key} onClick={() => setTab(tb.key)}>
            {tb.label} · {tb.n}
          </Chip>
        ))}
      </div>

      {tab === 'structures' && (
        <div className="space-y-3">
          {STRUCTURE_KINDS.map((kind) => (
            <StructureCard
              key={kind}
              L={L}
              lang={lang}
              kind={kind}
              entityId={id}
              nodes={entStructures.filter((n) => n.kind === kind)}
              addStructureNode={addStructureNode}
              removeStructureNode={removeStructureNode}
            />
          ))}
        </div>
      )}

      {tab === 'profiles' && (
        <div className="space-y-2">
          {entProfiles.length === 0 ? (
            <EmptyState icon={<Shield size={36} />} title={t('empty')} />
          ) : (
            entProfiles.map((p) => (
              <Card key={p.id} onClick={() => setProfileSheet(p)} className="px-1">
                <Row
                  leading={<Avatar name={p.name} color="#4f46e5" size={38} square icon={<Shield size={16} />} />}
                  title={p.name}
                  subtitle={`${Object.keys(p.permissions).length} ${L('transactions granted', 'معاملة ممنوحة')}`}
                  trailing={<Badge tone="gate">{Object.keys(p.permissions).length}</Badge>}
                />
              </Card>
            ))
          )}
        </div>
      )}

      {tab === 'positions' && (
        <PositionsTab L={L} entityId={id} positions={entPositions} addPosition={addPosition} />
      )}

      {tab === 'virtuals' && (
        <div className="space-y-2">
          {entVirtuals.length === 0 ? (
            <EmptyState icon={<Users size={36} />} title={t('empty')} />
          ) : (
            entVirtuals.map((v) => (
              <VirtualRow
                key={v.id}
                L={L}
                t={t}
                v={v}
                hostName={v.linkedNormalId ? normals.find((n) => n.id === v.linkedNormalId)?.fullName : undefined}
                onLink={() => setLinkTarget(v)}
                onUnlink={() => unlinkVirtual(v.id)}
                onBlock={() => blockVirtual(v.id, v.status !== 'blocked')}
              />
            ))
          )}
        </div>
      )}

      {tab === 'delegations' && (
        <DelegationsTab L={L} entityId={id} delegations={entDelegations} addDelegation={addDelegation} />
      )}

      {tab === 'groups' && (
        <div className="space-y-2">
          {entGroups.length === 0 ? (
            <EmptyState icon={<UsersRound size={36} />} title={t('empty')} />
          ) : (
            entGroups.map((g) => (
              <Card key={g.id} className="px-1">
                <Row
                  leading={<Avatar name={g.name} color="#0d9488" size={38} square icon={<UsersRound size={16} />} />}
                  title={g.name}
                  subtitle={g.positionName ? `${L('Position', 'الوظيفة')}: ${g.positionName}` : L('Custom criteria', 'معايير مخصصة')}
                />
              </Card>
            ))
          )}
        </div>
      )}

      {/* profile detail sheet */}
      <Sheet open={!!profileSheet} onClose={() => setProfileSheet(null)} title={profileSheet?.name}>
        {profileSheet && (
          <div className="space-y-2 pt-1">
            {Object.entries(profileSheet.permissions).map(([key, ps]) => (
              <div key={key} className="rounded-2xl bg-slate-50 px-3 py-2">
                <div className="text-xs font-semibold text-slate-700">{bl(txLabel(key as never), lang)}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {ABILITIES.filter((a) => ps && ps[a]).map((a) => (
                    <Badge key={a} tone="gate">{t(a)}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Sheet>

      {/* link sheet */}
      <Sheet open={!!linkTarget} onClose={() => setLinkTarget(null)} title={L('Link position', 'ربط الوظيفة')}>
        {linkTarget && (
          <div className="space-y-2 pt-1">
            <p className="text-xs text-slate-500">
              {L('Choose a person to host', 'اختر شخصًا ليستضيف')} <span className="font-semibold">{linkTarget.positionName}</span>.
            </p>
            {normals.map((n) => (
              <Card key={n.id} className="px-1">
                <Row
                  leading={<Avatar name={n.fullName} color={n.avatarColor} size={38} />}
                  title={n.fullName}
                  subtitle={n.city}
                  trailing={
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          createLinkRequest(id, linkTarget.id, n.id)
                          setLinkTarget(null)
                        }}
                      >
                        {t('linkRequest')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          linkVirtual(linkTarget.id, n.id)
                          setLinkTarget(null)
                        }}
                      >
                        {t('link')}
                      </Button>
                    </div>
                  }
                />
              </Card>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ── Structure card with add/remove ──────────────────────────────────────────────
function StructureCard({
  L,
  lang,
  kind,
  entityId,
  nodes,
  addStructureNode,
  removeStructureNode,
}: {
  L: (en: string, ar: string) => string
  lang: 'en' | 'ar'
  kind: StructureKind
  entityId: string
  nodes: StructureNode[]
  addStructureNode: (n: Omit<StructureNode, 'id'>) => string
  removeStructureNode: (id: string) => void
}) {
  const [addParent, setAddParent] = useState<string | null>(null)
  const [text, setText] = useState('')

  const roots = nodes.filter((n) => n.parentId === null || n.level === 0)
  const childrenOf = (pid: string) => nodes.filter((n) => n.parentId === pid)

  const ensureRoot = (): string => {
    const r = nodes.find((n) => n.level === 0)
    if (r) return r.id
    return addStructureNode({ entityId, kind, code: STRUCTURE_ROOT_CODE[kind], name: kind, level: 0, parentId: null })
  }

  const submitAdd = (parentId: string | null, level: number) => {
    if (!text.trim()) return
    const pid = parentId ?? ensureRoot()
    addStructureNode({
      entityId,
      kind,
      code: STRUCTURE_ROOT_CODE[kind] + level,
      name: text.trim(),
      level,
      parentId: pid,
    })
    setText('')
    setAddParent(null)
  }

  const renderNode = (n: StructureNode) => (
    <div key={n.id}>
      <div className="flex items-center gap-2 py-1" style={{ paddingInlineStart: n.level * 14 }}>
        <span className="font-mono text-[10px] text-gate-500" dir="ltr">{n.code}</span>
        <span className="flex-1 truncate text-xs text-slate-700">{n.name}</span>
        {n.level > 0 && (
          <>
            <button onClick={() => setAddParent(addParent === n.id ? null : n.id)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
              <Plus size={13} />
            </button>
            <button onClick={() => removeStructureNode(n.id)} className="rounded-full p-1 text-rose-400 hover:bg-rose-50">
              <Trash2 size={13} />
            </button>
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
        <Input value={addParent === null ? text : ''} onChange={(e) => { setAddParent(null); setText(e.target.value) }} placeholder={L('Add level-1 node…', 'إضافة عقدة مستوى ١…')} />
        <Button size="sm" variant="secondary" onClick={() => submitAdd(null, 1)}>
          <Plus size={14} />
        </Button>
      </div>
    </Card>
  )
}

function PositionsTab({
  L,
  entityId,
  positions,
  addPosition,
}: {
  L: (en: string, ar: string) => string
  entityId: string
  positions: import('@/types').Position[]
  addPosition: (entityId: string, name: string) => string
}) {
  const [name, setName] = useState('')
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L('New position…', 'وظيفة جديدة…')} />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (!name.trim()) return
            addPosition(entityId, name.trim())
            setName('')
          }}
        >
          <Plus size={14} />
        </Button>
      </div>
      {positions.length === 0 ? (
        <EmptyState icon={<Briefcase size={32} />} title={L('No positions', 'لا توجد وظائف')} />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {positions.map((p) => (
            <Badge key={p.id} tone="slate">{p.name}</Badge>
          ))}
        </div>
      )}
    </Card>
  )
}

function DelegationsTab({
  L,
  entityId,
  delegations,
  addDelegation,
}: {
  L: (en: string, ar: string) => string
  entityId: string
  delegations: import('@/types').DelegationItem[]
  addDelegation: (d: Omit<import('@/types').DelegationItem, 'id'>) => void
}) {
  const [subject, setSubject] = useState('')
  const [limit, setLimit] = useState('')
  return (
    <Card className="p-4 space-y-3">
      <Field label={L('Subject', 'الموضوع')}>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label={L('Limit', 'الحد')}>
        <Input value={limit} onChange={(e) => setLimit(e.target.value)} />
      </Field>
      <Button
        size="sm"
        variant="secondary"
        disabled={!subject.trim()}
        onClick={() => {
          addDelegation({ entityId, subject: subject.trim(), limit: limit.trim() })
          setSubject('')
          setLimit('')
        }}
      >
        <Plus size={14} /> {L('Add', 'إضافة')}
      </Button>
      {delegations.length > 0 && (
        <div className="space-y-1">
          {delegations.map((d) => (
            <div key={d.id} className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
              <span className="font-medium text-slate-700">{d.subject}</span>
              {d.limit && <span className="text-slate-400"> · {d.limit}</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function VirtualRow({
  L,
  t,
  v,
  hostName,
  onLink,
  onUnlink,
  onBlock,
}: {
  L: (en: string, ar: string) => string
  t: (k: string) => string
  v: VirtualCharacter
  hostName?: string
  onLink: () => void
  onUnlink: () => void
  onBlock: () => void
}) {
  const resolve = useResolveActor()
  const r = resolve({ kind: 'virtual', virtualId: v.id })
  const tone = v.status === 'active' ? 'green' : v.status === 'blocked' ? 'red' : 'slate'
  const statusText = v.status === 'active' ? t('active') : v.status === 'blocked' ? t('blocked') : t('unlinked')
  return (
    <Card className="p-3.5 space-y-2">
      <div className="flex items-center gap-2.5">
        <Avatar name={v.positionName} color={r.color} size={38} square />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-slate-800">{v.positionName}</div>
          <div className="truncate font-mono text-[10px] text-gate-600" dir="ltr">{r.address}</div>
        </div>
        <Badge tone={tone}>{statusText}</Badge>
      </div>
      {hostName && (
        <div className="text-[11px] text-slate-500">
          {t('linkedTo')} <span className="font-medium text-slate-700">{hostName}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {v.status === 'unlinked' ? (
          <Button size="sm" variant="secondary" onClick={onLink}>
            <Link2 size={13} /> {t('link')}
          </Button>
        ) : v.status === 'active' ? (
          <Button size="sm" variant="subtle" onClick={onUnlink}>
            <Unlink size={13} /> {t('unlink')}
          </Button>
        ) : null}
        <Button size="sm" variant={v.status === 'blocked' ? 'secondary' : 'danger'} onClick={onBlock}>
          <Ban size={13} /> {v.status === 'blocked' ? L('Unblock', 'إلغاء الحظر') : t('block')}
        </Button>
      </div>
    </Card>
  )
}
