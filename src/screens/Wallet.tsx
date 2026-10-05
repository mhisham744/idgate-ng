import { useMemo, useState } from 'react'
import { ArrowLeft, Plus, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { ActorRef } from '@/types'
import { useStore } from '@/store'
import { useLang } from '@/i18n'
import { CredentialCard } from '@/components/CredentialCard'
import { IssueCredentialSheet } from '@/components/IssueCredentialSheet'
import { Button, Chip, EmptyState, SectionHeader } from '@/ui/primitives'

export function Wallet() {
  const navigate = useNavigate()
  const { t, isRtl } = useLang()
  const active = useStore((s) => s.active)
  const can = useStore((s) => s.can)
  const isVerifiedIssuer = useStore((s) => s.isVerifiedIssuer)
  const myCredentials = useStore((s) => s.myCredentials)
  const credentialsIssuedBy = useStore((s) => s.credentialsIssuedBy)
  const revokeCredential = useStore((s) => s.revokeCredential)
  // re-render on credential changes
  useStore((s) => s.credentials)

  const [tab, setTab] = useState<'held' | 'issued'>('held')
  const [issueOpen, setIssueOpen] = useState(false)

  const held = useMemo(() => myCredentials(), [myCredentials])
  const issued = useMemo(
    () => (active ? credentialsIssuedBy(active as ActorRef) : []),
    [active, credentialsIssuedBy],
  )
  const canIssue = !!active && can('tool.issueCredential') && isVerifiedIssuer(active as ActorRef)

  const list = tab === 'held' ? held : issued

  return (
    <div className="space-y-4 p-4 pb-10">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft size={16} className={isRtl ? 'rotate-180 me-1.5' : 'me-1.5'} />
        {t('back')}
      </Button>

      <div>
        <h1 className="text-xl font-bold text-slate-800">{t('wallet')}</h1>
        <p className="mt-0.5 text-sm text-slate-500">{t('walletDesc')}</p>
      </div>

      <div className="flex items-center gap-2">
        <Chip active={tab === 'held'} onClick={() => setTab('held')}>{t('heldByMe')} · {held.length}</Chip>
        <Chip active={tab === 'issued'} onClick={() => setTab('issued')}>{t('issuedByMe')} · {issued.length}</Chip>
      </div>

      {tab === 'issued' && canIssue && (
        <Button variant="secondary" size="sm" onClick={() => setIssueOpen(true)}>
          <Plus size={15} className="me-1" /> {t('issueCredential')}
        </Button>
      )}

      {list.length === 0 ? (
        <EmptyState icon={<WalletCards size={24} />} title={t('noCredentials')} subtitle={tab === 'issued' && !canIssue ? t('issuerNotVerified') : undefined} />
      ) : (
        <div className="space-y-3">
          <SectionHeader title={tab === 'held' ? t('heldByMe') : t('issuedByMe')} />
          {list.map((c) => (
            <CredentialCard
              key={c.id}
              cred={c}
              onRevoke={tab === 'issued' ? () => revokeCredential(c.id) : undefined}
            />
          ))}
        </div>
      )}

      <IssueCredentialSheet open={issueOpen} onClose={() => setIssueOpen(false)} />
    </div>
  )
}
