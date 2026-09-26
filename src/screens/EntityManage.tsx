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
  List,
  Network,
  Pencil,
  Plus,
  Search,
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
import { personalAddress } from '@/lib/identity'
import { OrgChart } from '@/components/OrgChart'
import { StructureEditor } from '@/components/StructureEditor'
import { ProfileEditor } from '@/components/ProfileEditor'
import { GroupFormSheet } from '@/components/GroupForm'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  cx,
  EmptyState,
  Field,
  Input,
  Modal,
  Row,
  Sheet,
} from '@/ui/primitives'
import type { Group } from '@/types'

type Tab = 'structures' | 'profiles' | 'positions' | 'virtuals' | 'delegations'
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
  const updateDelegation = useStore((s) => s.updateDelegation)
  const createLinkRequest = useStore((s) => s.createLinkRequest)
  const linkVirtual = useStore((s) => s.linkVirtual)
  const unlinkVirtual = useStore((s) => s.unlinkVirtual)
  const blockVirtual = useStore((s) => s.blockVirtual)
  const removeGroup = useStore((s) => s.removeGroup)

  const [tab, setTab] = useState<Tab>('structures')
  const [profOpen, setProfOpen] = useState(false)
  const [profEdit, setProfEdit] = useState<Profile | null>(null)
  const [profileQuery, setProfileQuery] = useState('')
  const [positionQuery, setPositionQuery] = useState('')
  const [virtualQuery, setVirtualQuery] = useState('')
  const [linkTarget, setLinkTarget] = useState<VirtualCharacter | null>(null)
  const [structView, setStructView] = useState<'list' | 'chart'>('list')
  const [chartKind, setChartKind] = useState<StructureKind>('corporate')

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

  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: 'structures', label: t('communicationStructure'), n: entStructures.length },
    { key: 'profiles', label: t('authorization'), n: entProfiles.length },
    { key: 'positions', label: t('positions'), n: entPositions.length },
    { key: 'virtuals', label: L('Virtual Entity', 'الكيان الافتراضي'), n: entVirtuals.length },
    { key: 'delegations', label: L('Delegations', 'التفويضات'), n: entDelegations.length },
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
            <div className="truncate font-mono text-[11px] text-gate-700" dir="ltr">
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
          {/* view toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-2xl bg-slate-100 p-1">
              <button
                onClick={() => setStructView('list')}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400',
                  structView === 'list' ? 'bg-white text-gate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <List size={14} /> {L('List', 'قائمة')}
              </button>
              <button
                onClick={() => setStructView('chart')}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gate-400',
                  structView === 'chart' ? 'bg-white text-gate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Network size={14} /> {L('Org chart', 'مخطط تنظيمي')}
              </button>
            </div>
          </div>

          {structView === 'list' ? (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 [&>*]:self-start">
              {STRUCTURE_KINDS.map((kind) => (
                <StructureEditor
                  key={kind}
                  L={L}
                  lang={lang}
                  kind={kind}
                  entityId={id}
                  nodes={entStructures.filter((n) => n.kind === kind)}
                  canDelete={false}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* kind selector */}
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 thin-scroll">
                {STRUCTURE_KINDS.map((kind) => (
                  <Chip key={kind} active={chartKind === kind} onClick={() => setChartKind(kind)}>
                    {bl(STRUCTURE_LABELS[kind], lang)}
                  </Chip>
                ))}
              </div>
              <OrgChart
                key={chartKind}
                entityId={id}
                kind={chartKind}
                nodes={entStructures.filter((n) => n.kind === chartKind)}
                L={L}
                rootLabel={bl(STRUCTURE_LABELS[chartKind], lang)}
                canDelete={false}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'profiles' && (
        <div className="space-y-2">
          <Button full variant={entProfiles.length === 0 ? 'primary' : 'secondary'} onClick={() => { setProfEdit(null); setProfOpen(true) }}>
            <Plus size={16} /> {L('New profile', 'بروفايل جديد')}
          </Button>
          <SearchBox value={profileQuery} onChange={setProfileQuery} placeholder={L('Search profiles…', 'ابحث في البروفايلات…')} />
          {entProfiles.filter((p) => p.name.toLowerCase().includes(profileQuery.trim().toLowerCase())).length === 0 ? (
            <EmptyState icon={<Shield size={36} />} title={t('empty')} />
          ) : (
            <div className="space-y-2">
              {entProfiles
                .filter((p) => p.name.toLowerCase().includes(profileQuery.trim().toLowerCase()))
                .map((p) => (
                  <Card key={p.id} onClick={() => { setProfEdit(p); setProfOpen(true) }} className="px-1">
                    <Row
                      leading={<Avatar name={p.name} color="#4f46e5" size={38} square icon={<Shield size={16} />} />}
                      title={p.name}
                      subtitle={`${Object.keys(p.permissions).length} ${L('transactions granted', 'معاملة ممنوحة')}`}
                      trailing={<Badge tone="gate">{Object.keys(p.permissions).length}</Badge>}
                    />
                  </Card>
                ))}
            </div>
          )}
        </div>
      )}

      {tab === 'positions' && (
        <PositionsTab L={L} entityId={id} positions={entPositions} addPosition={addPosition} query={positionQuery} setQuery={setPositionQuery} />
      )}

      {tab === 'virtuals' && (
        <div className="space-y-2">
          <SearchBox value={virtualQuery} onChange={setVirtualQuery} placeholder={L('Search virtual entities…', 'ابحث في الكيانات…')} />
          {entVirtuals.filter((v) => v.positionName.toLowerCase().includes(virtualQuery.trim().toLowerCase())).length === 0 ? (
            <EmptyState icon={<Users size={36} />} title={t('empty')} />
          ) : (
            <div className="space-y-2">
              {entVirtuals
                .filter((v) => v.positionName.toLowerCase().includes(virtualQuery.trim().toLowerCase()))
                .map((v) => (
                  <VirtualRow
                    key={v.id}
                    L={L}
                    t={t}
                    v={v}
                    host={v.linkedNormalId ? normals.find((n) => n.id === v.linkedNormalId) : undefined}
                    onUnlink={() => unlinkVirtual(v.id)}
                    onBlock={() => blockVirtual(v.id, v.status !== 'blocked')}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {tab === 'delegations' && (
        <DelegationsTab L={L} entityId={id} delegations={entDelegations} addDelegation={addDelegation} updateDelegation={updateDelegation} />
      )}

      {/* profile create / edit */}
      <ProfileEditor open={profOpen} onClose={() => setProfOpen(false)} entityId={id} profile={profEdit} />

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
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute inset-y-0 start-3 my-auto text-slate-400" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="ps-9" />
    </div>
  )
}

function PositionsTab({
  L,
  entityId,
  positions,
  addPosition,
  query,
  setQuery,
}: {
  L: (en: string, ar: string) => string
  entityId: string
  positions: import('@/types').Position[]
  addPosition: (entityId: string, name: string) => string
  query: string
  setQuery: (v: string) => void
}) {
  const [name, setName] = useState('')
  const shown = positions.filter((p) => p.name.toLowerCase().includes(query.trim().toLowerCase()))
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
      <SearchBox value={query} onChange={setQuery} placeholder={L('Search positions…', 'ابحث في الوظائف…')} />
      {shown.length === 0 ? (
        <EmptyState icon={<Briefcase size={32} />} title={L('No positions', 'لا توجد وظائف')} />
      ) : (
        <div className="space-y-1.5">
          {shown.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <Briefcase size={14} className="text-gate-600" />
              <span className="text-sm font-medium text-slate-700">{p.name}</span>
            </div>
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
  updateDelegation,
}: {
  L: (en: string, ar: string) => string
  entityId: string
  delegations: import('@/types').DelegationItem[]
  addDelegation: (d: Omit<import('@/types').DelegationItem, 'id'>) => void
  updateDelegation: (id: string, patch: Partial<import('@/types').DelegationItem>) => void
}) {
  const [subject, setSubject] = useState('')
  const [limit, setLimit] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editLimit, setEditLimit] = useState('')
  return (
    <Card className="p-4 space-y-3">
      <Field label={L('Subject', 'الموضوع')}>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label={L('Limit (amount)', 'الحد (قيمة)')} hint={L('numeric', 'رقمي')}>
        <Input inputMode="numeric" dir="ltr" value={limit} onChange={(e) => setLimit(e.target.value.replace(/[^\d]/g, ''))} />
      </Field>
      <Button
        size="sm"
        variant="secondary"
        disabled={!subject.trim()}
        onClick={() => {
          addDelegation({ entityId, subject: subject.trim(), limit: limit.trim(), limitAmount: limit ? Number(limit) : undefined })
          setSubject('')
          setLimit('')
        }}
      >
        <Plus size={14} /> {L('Add', 'إضافة')}
      </Button>
      {delegations.length > 0 && (
        <div className="space-y-1.5">
          {delegations.map((d) =>
            editId === d.id ? (
              <div key={d.id} className="space-y-2 rounded-xl bg-slate-50 p-2.5">
                <Input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} placeholder={L('Subject', 'الموضوع')} />
                <Input inputMode="numeric" dir="ltr" value={editLimit} onChange={(e) => setEditLimit(e.target.value.replace(/[^\d]/g, ''))} placeholder={L('Limit', 'الحد')} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={!editSubject.trim()}
                    onClick={() => {
                      // Only overwrite the limit when a new numeric value is entered,
                      // so editing just the subject doesn't wipe a legacy text limit.
                      updateDelegation(d.id, {
                        subject: editSubject.trim(),
                        ...(editLimit ? { limit: editLimit, limitAmount: Number(editLimit) } : {}),
                      })
                      setEditId(null)
                    }}
                  >
                    {L('Save', 'حفظ')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditId(null)}>{L('Cancel', 'إلغاء')}</Button>
                </div>
              </div>
            ) : (
              <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium text-slate-700">{d.subject}</span>
                  {(d.limitAmount != null || d.limit) && <span className="text-slate-400"> · {d.limitAmount != null ? d.limitAmount.toLocaleString() : d.limit}</span>}
                </span>
                <button
                  onClick={() => {
                    setEditId(d.id)
                    setEditSubject(d.subject)
                    setEditLimit(d.limitAmount != null ? String(d.limitAmount) : '')
                  }}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-gate-600"
                  aria-label={L('Edit', 'تعديل')}
                >
                  <Pencil size={13} />
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </Card>
  )
}

function VirtualRow({
  L,
  t,
  v,
  host,
  onUnlink,
  onBlock,
}: {
  L: (en: string, ar: string) => string
  t: (k: string) => string
  v: VirtualCharacter
  host?: import('@/types').NormalCharacter
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
          <div className="truncate font-address text-[10px] text-gate-700" dir="ltr">{r.address}</div>
        </div>
        <Badge tone={tone}>{statusText}</Badge>
      </div>
      {host && (
        <div className="space-y-0.5 rounded-xl bg-slate-50 px-2.5 py-1.5">
          <div className="text-[11px] text-slate-500">
            {t('linkedTo')} <span className="font-medium text-slate-700">{host.fullName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span>{L('Personal account code', 'كود الحساب الشخصي')}</span>
            <span dir="ltr" className="font-address text-gate-700">{personalAddress(host)}</span>
          </div>
        </div>
      )}
      {(v.positionCode || (v.additionalCodes && v.additionalCodes.length > 0)) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400">
          {v.positionCode && (
            <span className="inline-flex items-center gap-1">
              {L('Position code', 'كود المنصب')}
              <span dir="ltr" className="font-mono text-slate-600">{v.positionCode}</span>
            </span>
          )}
          {v.additionalCodes && v.additionalCodes.length > 0 && (
            <span className="inline-flex items-center gap-1">
              {L('Additional', 'إضافية')}
              <span dir="ltr" className="font-mono text-slate-600">{v.additionalCodes.join(', ')}</span>
            </span>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {v.status === 'active' ? (
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
