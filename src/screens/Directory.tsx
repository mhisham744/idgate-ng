import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, ChevronRight, Layers, Users, UserPlus, X, Briefcase } from 'lucide-react'
import { useStore } from '@/store'
import { useLang, bl } from '@/i18n'
import { ORG_TYPE_LABELS, LEGAL_TYPE_LABELS, INDUSTRY_LABELS } from '@/data/reference'
import { actorKey, sameActor } from '@/lib/identity'
import { ActorLine, useResolveActor } from '@/components/identity'
import type { ActorRef } from '@/types'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Input,
  Row,
  SectionHeader,
} from '@/ui/primitives'

type Seg = 'orgs' | 'people'

export function Directory() {
  const navigate = useNavigate()
  const { t, lang, isRtl } = useLang()
  const L = (en: string, ar: string) => (isRtl ? ar : en)

  const normalId = useStore((s) => s.normalId)
  const active = useStore((s) => s.active)
  const entities = useStore((s) => s.entities)
  const normals = useStore((s) => s.normals)
  const positions = useStore((s) => s.positions)
  const virtuals = useStore((s) => s.virtuals)
  const structures = useStore((s) => s.structures)
  const contactRequests = useStore((s) => s.contactRequests)
  const linkRequests = useStore((s) => s.linkRequests)
  const can = useStore((s) => s.can)
  const sendContactRequest = useStore((s) => s.sendContactRequest)
  const respondContactRequest = useStore((s) => s.respondContactRequest)
  const respondLinkRequest = useStore((s) => s.respondLinkRequest)
  const resolve = useResolveActor()

  const [seg, setSeg] = useState<Seg>('orgs')
  const [q, setQ] = useState('')
  const query = q.trim().toLowerCase()

  const canContact = can('tool.contactRequest')

  // incoming requests targeted at the active account / signed-in person
  const incomingContacts = active
    ? contactRequests.filter((c) => c.status === 'pending' && sameActor(c.to, active as ActorRef))
    : []
  const incomingLinks = linkRequests.filter((l) => l.status === 'pending' && l.targetNormalId === normalId)

  const orgs = entities.filter(
    (e) =>
      !query ||
      e.commercialName.toLowerCase().includes(query) ||
      e.formalName.toLowerCase().includes(query),
  )
  const people = normals.filter(
    (n) => n.id !== normalId && (!query || n.fullName.toLowerCase().includes(query)),
  )

  const hasPendingTo = (ref: ActorRef) =>
    !!active &&
    contactRequests.some(
      (c) => c.status === 'pending' && sameActor(c.from, active as ActorRef) && sameActor(c.to, ref),
    )

  return (
    <div className="p-4 space-y-4 pb-8">
      <SectionHeader title={t('directory')} />

      {/* requests */}
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

      {/* segment + search */}
      <div className="flex gap-2">
        <Chip active={seg === 'orgs'} onClick={() => setSeg('orgs')}>
          {L('Organizations', 'المؤسسات')}
        </Chip>
        <Chip active={seg === 'people'} onClick={() => setSeg('people')}>
          {L('People', 'الأشخاص')}
        </Chip>
      </div>
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} />

      {seg === 'orgs' && (
        <div className="space-y-3">
          {orgs.length === 0 ? (
            <EmptyState icon={<Building2 size={36} />} title={t('empty')} />
          ) : (
            orgs.map((e) => {
              const posCount = positions.filter((p) => p.entityId === e.id).length
              const virCount = virtuals.filter((v) => v.entityId === e.id).length
              const strCount = structures.filter((n) => n.entityId === e.id).length
              return (
                <Card key={e.id} onClick={() => navigate('/settings/entity/' + e.id)} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={e.commercialName} color={e.logoColor} size={44} square icon={<Building2 size={20} />} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-800">{e.commercialName}</div>
                      <div className="truncate font-mono text-[11px] text-gate-600" dir="ltr">
                        {e.domain}.{e.orgType}.{e.legalEntityType}
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 rtl:rotate-180" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge tone="gate">{bl(ORG_TYPE_LABELS[e.orgType], lang)}</Badge>
                    <Badge tone="slate">{bl(LEGAL_TYPE_LABELS[e.legalEntityType], lang)}</Badge>
                    <Badge tone="teal">{bl(INDUSTRY_LABELS[e.mainIndustry], lang)}</Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[11px] font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1"><Briefcase size={13} /> {posCount}</span>
                    <span className="inline-flex items-center gap-1"><Users size={13} /> {virCount}</span>
                    <span className="inline-flex items-center gap-1"><Layers size={13} /> {strCount}</span>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      {seg === 'people' && (
        <div className="space-y-2">
          {people.length === 0 ? (
            <EmptyState icon={<Users size={36} />} title={t('empty')} />
          ) : (
            people.map((n) => {
              const ref: ActorRef = { kind: 'normal', normalId: n.id }
              const roles = virtuals.filter((v) => v.linkedNormalId === n.id).length
              const pending = hasPendingTo(ref)
              const isContactActive = active && actorKey(active) === actorKey(ref)
              return (
                <Card key={n.id} className="p-3.5">
                  <ActorLine
                    actor={ref}
                    size={42}
                    trailing={
                      isContactActive ? null : pending ? (
                        <Badge tone="amber">{t('pending')}</Badge>
                      ) : canContact ? (
                        <Button size="sm" variant="secondary" onClick={() => sendContactRequest(ref)}>
                          <UserPlus size={13} /> {L('Contact', 'تواصل')}
                        </Button>
                      ) : (
                        <Badge tone="slate">{t('canReceiveOnly')}</Badge>
                      )
                    }
                  />
                  <div className="mt-2 flex items-center gap-3 ps-[52px] text-[11px] text-slate-500">
                    <span>{n.city}</span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={12} /> {roles} {L('roles', 'صفات')}
                    </span>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
