import { Navigate, Route, Routes } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '@/store'
import { useI18n } from '@/i18n'
import { useTheme } from '@/theme'
import { AppShell } from '@/components/AppShell'
import { applyStatusBarStyle } from '@/native'
import { Onboarding } from '@/screens/Onboarding'
import { Home } from '@/screens/Home'
import { Messages } from '@/screens/Messages'
import { Notifications } from '@/screens/Notifications'
import { Tools } from '@/screens/Tools'
import { IDGateCode } from '@/screens/IDGateCode'
import { Vacancies } from '@/screens/Vacancies'
import { GroupsScreen } from '@/screens/Groups'
import { Settings } from '@/screens/Settings'
import { PersonalMasterData } from '@/screens/PersonalMasterData'
import { CommunicationAreas } from '@/screens/CommunicationAreas'
import { LinkPosition } from '@/screens/LinkPosition'
import { DelegationShow } from '@/screens/DelegationShow'
import { MyEntities } from '@/screens/MyEntities'
import { EntityWizard } from '@/screens/EntityWizard'
import { EntityManage } from '@/screens/EntityManage'
import { AboutConcept } from '@/screens/AboutConcept'
import { Directory } from '@/screens/Directory'
import { Wallet } from '@/screens/Wallet'
import { VerifyCredential } from '@/screens/VerifyCredential'
import { Tawkeel } from '@/screens/Tawkeel'
import { useSeedHashBackfill } from '@/lib/backfill'

function Shell() {
  return (
    <AppShell>
      <Routes>
        <Route path="/home" element={<Home />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/tools/idgate" element={<IDGateCode />} />
        <Route path="/tools/vacancies" element={<Vacancies />} />
        <Route path="/tools/wallet" element={<Wallet />} />
        <Route path="/tools/verify" element={<VerifyCredential />} />
        <Route path="/tools/groups" element={<GroupsScreen />} />
        <Route path="/settings/groups" element={<GroupsScreen />} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/personal" element={<PersonalMasterData />} />
        <Route path="/settings/communication-areas" element={<CommunicationAreas />} />
        <Route path="/settings/link-position" element={<LinkPosition />} />
        <Route path="/settings/delegation-show" element={<DelegationShow />} />
        <Route path="/settings/tawkeel" element={<Tawkeel />} />
        <Route path="/settings/entities" element={<MyEntities />} />
        <Route path="/settings/entities/new" element={<EntityWizard />} />
        <Route path="/settings/entity/:id" element={<EntityManage />} />
        <Route path="/settings/about" element={<AboutConcept />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  const onboarded = useStore((s) => s.onboarded)
  const normalId = useStore((s) => s.normalId)
  const lang = useI18n((s) => s.lang)
  const theme = useTheme((s) => s.theme)

  // Strategy edition: fill integrity hashes for seeded credentials/tawkeels once.
  useSeedHashBackfill()

  // Reflect language on <html> for global dir + font.
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  }, [lang])

  // Reflect appearance on <html> — Tailwind's `dark:` variants key off `.dark`.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#151f42')
  }, [theme])

  const signedIn = onboarded && normalId

  // Native status bar: logged-out Onboarding shows the dark gradient; the signed-in
  // shell shows the theme surface. Keep the status-bar icons legible against it.
  useEffect(() => {
    applyStatusBarStyle(!signedIn || theme === 'dark')
  }, [signedIn, theme])

  return signedIn ? (
    <Shell />
  ) : (
    <Routes>
      <Route path="*" element={<Onboarding />} />
    </Routes>
  )
}
