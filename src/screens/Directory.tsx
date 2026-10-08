import { useMemo, useState } from 'react'
import { Building2, Check, Layers, Users, UsersRound, X, Briefcase, Network } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { ORG_TYPE_LABELS, LEGAL_TYPE_LABELS, INDUSTRY_LABELS, STRUCTURE_LABELS } from '@/data/reference'
import { sameActor, actorKey } from '@/lib/identity'
import { ActorLine, useResolveActor } from '@/components/identity'
import { useDirectory } from '@/lib/userScope'
import type { ActorRef, StructureKind } from '@/types'
import { Avatar, Badge, Button, Card, Chip, EmptyState, Input, SectionHeader } from '@/ui/primitives'

type Seg = 'orgs' | 'people' | 'groups' | StructureKind
const STRUCTURE_KINDS: StructureKind[] = ['corporate', 'relation', 'organization', 'geographical']

/**
 * Directory — display-only view of what the ACTIVE account can see: linked
 * organizations, people it may reach (contacts + same-area virtuals), the groups
 * it belongs to, and (for a virtual) the structure nodes it is placed in.
 * Also where incoming contact / link requests are accepted.
 */
export function Directory() {
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const normalId = useStore((s) => s.normalId)
  const active = useStore((s) => s.active)
  const entities = useStore((s) => s.entities)
  const virtuals = useStore((s) => s.virtuals)
  const contactRequests = useStore((s) => s.contactRequests)
  const linkRequests = useStore((s) => s.linkRequests)
  const respondContactRequest = useStore((s) => s.respondContactRequest)
  const respondLinkRequest = useStore((s) => s.respondLinkRequest)
  const disconnectContact = useStore((s) => s.disconnectContact)
  const resolve = useResolveActor()
  const dir = useDirectory()

  const isVirtual = active?.kind === 'virtual'
  const [seg, setSeg] = useState<Seg>('orgs')
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  // incoming requests targeted at the active account / signed-in person
  const incomingContacts = active
    ? contactRequests.filter((c) => c.status === 'pending' && sameActor(c.to, active as ActorRef))
    : []
  const incomingLinks = linkRequests.filter((l) => l.status === 'pending' && l.targetNormalId === normalId)

  const orgs = dir.orgs.filter((e) => !query || e.commercialName.toLowerCase().includes(query) || e.formalName.toLowerCase().includes(query))
  const people = dir.people.filter((r) => !query || resolve(r).displayName.toLowerCase().includes(query))
  const groups = dir.groups.filter((g) => !query || g.name.toLowerCase().includes(query))

  const tabs: { key: Seg; label: string }[] = [
    { key: 'orgs', label: L('Organizations', 'المؤسسات') },
    { key: 'people', label: L('People', 'الأشخاص') },
    { key: 'groups', label: t('groups') },
    ...(isVirtual ? STRUCTURE_KINDS.map((k) => ({ key: k as Seg, label: bl(STRUCTURE_LABELS[k], lang) })) : []),
  ]
  // Fall back to the first tab if the current segment isn't available (e.g. after
  // switching from a virtual to a normal account, where the 'nodes' tab disappears).
  const activeSeg: Seg = tabs.some((tb) => tb.key === seg) ? seg : 'orgs'

  return (
    <div className="p-4 space-y-4 pb-8">
      <SectionHeader title={t('directory')} />

      {/* incoming requests */}
      {(incomingContacts.length > 0 || incomingLinks.length > 0) && (
        <Card className="p-4 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">{L('Requests', 'الطلبات')}</h3>
          {incomingLinks.map((l) => {
            const v = virtuals.find((x) => x.id === l.virtualId)
            const e = entities.find((x) => x.id === l.entityId)
            return (
              <div key={l.id} className="flex items-center gap-2 rounded-2xl bg-gate-50 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-slate-700">
                    {t('linkRequest')}: {v?.positionName}
                  </div>
                  <div className="truncate text-[11px] text-slate-500">{e?.commercialName}</div>
                </div>
                <Button size="sm" onClick={() => respondLinkRequest(l.id, 'accepted')}>
                  <Check size={13} /> {t('accept')}
                </Button>
                <Button size="sm" variant="subtle" onClick={() => respondLinkRequest(l.id, 'rejected')}>
                  <X size={13} />
                </Button>
              </div>
            )
          })}
          {incomingContacts.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2">
              <div className="min-w-0 flex-1">
                <ActorLine actor={c.from} size={34} />
              </div>
              <Button size="sm" onClick={() => respondContactRequest(c.id, 'accepted')}>
                <Check size={13} /> {t('accept')}
              </Button>
              <Button size="sm" variant="subtle" onClick={() => respondContactRequest(c.id, 'rejected')}>
                <X size={13} />
              </Button>
            </div>
          ))}
        </Card>
      )}

      {/* tabs + search */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 thin-scroll">
        {tabs.map((tb) => (
          <Chip key={tb.key} active={activeSeg === tb.key} onClick={() => setSeg(tb.key)}>
            {tb.label}
          </Chip>
        ))}
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} />

      {activeSeg === 'orgs' && (
        <div className="space-y-3">
          {orgs.length === 0 ? (
            <EmptyState icon={<Building2 size={36} />} title={t('empty')} />
          ) : (
            orgs.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={e.commercialName} color={e.logoColor} size={44} square icon={<Building2 size={20} />} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-slate-800">{e.commercialName}</div>
                    <div className="truncate font-address text-[11px] text-gate-700" dir="ltr">
                      {e.domain}.{e.orgType}.{e.legalEntityType}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <Badge tone="gate">{bl(ORG_TYPE_LABELS[e.orgType], lang)}</Badge>
                  <Badge tone="slate">{bl(LEGAL_TYPE_LABELS[e.legalEntityType], lang)}</Badge>
                  <Badge tone="teal">{bl(INDUSTRY_LABELS[e.mainIndustry], lang)}</Badge>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeSeg === 'people' && (
        <div className="space-y-2">
          {people.length === 0 ? (
            <EmptyState icon={<Users size={36} />} title={t('empty')} />
          ) : (
            people.map((r) => {
              const origin = dir.peopleOrigin.get(actorKey(r)) ?? 'auto'
              return (
                <Card key={actorKey(r)} className="p-3.5">
                  <ActorLine
                    actor={r}
                    size={42}
                    trailing={<Badge tone={origin === 'manual' ? 'gate' : 'teal'}>{origin === 'manual' ? t('connManual') : t('connAuto')}</Badge>}
                  />
                  {origin === 'manual' && (
                    <div className="mt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="subtle"
                        onClick={() =>
                          disconnectContact(r, {
                            subject: L('Connection ended', 'انتهى الاتصال'),
                            body: L(
                              `${resolve(active as ActorRef).displayName} has ended the connection. This is an automated no-reply notice.`,
                              `${resolve(active as ActorRef).displayName} أنهى الاتصال. هذه رسالة تلقائية بلا رد.`,
                            ),
                          })
                        }
                      >
                        <X size={13} /> {t('disconnect')}
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })
          )}
        </div>
      )}

      {activeSeg === 'groups' && (
        <div className="space-y-2">
          {groups.length === 0 ? (
            <EmptyState icon={<UsersRound size={36} />} title={t('empty')} />
          ) : (
            groups.map((g) => (
              <Card key={g.id} className="p-3.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name={g.name} color="#0d9488" size={38} square icon={<UsersRound size={16} />} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-800">{g.name}</div>
                    {g.positionNames && g.positionNames.length > 0 && (
                      <div className="truncate text-xs text-slate-500">{g.positionNames.join(', ')}</div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {STRUCTURE_KINDS.includes(activeSeg as StructureKind) &&
        (() => {
          const list = dir.structureNodes[activeSeg as StructureKind].filter((n) => !query || n.name.toLowerCase().includes(query))
          return (
            <div className="space-y-2">
              {list.length === 0 ? (
                <EmptyState icon={<Layers size={36} />} title={t('empty')} />
              ) : (
                list.map((n) => {
                  const ent = entities.find((e) => e.id === n.entityId)
                  return (
                    <Card key={n.id} className="flex items-center gap-2.5 p-3.5">
                      <Avatar name={n.name} color="#4f46e5" size={38} square icon={<Network size={16} />} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-slate-800">{n.name}</div>
                        <div className="truncate text-xs text-slate-500">
                          {ent?.commercialName} · <span dir="ltr" className="font-mono">{n.code}</span>
                        </div>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          )
        })()}
    </div>
  )
}
