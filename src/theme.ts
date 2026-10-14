import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

/** First-launch default: follow the device appearance. Once the person toggles,
 *  the persisted choice wins (persist merges stored state over this initial). */
function deviceTheme(): Theme {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

interface ThemeStore {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

/** Persisted appearance preference. Applied to <html> as the `dark` class by App. */
export const useTheme = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: deviceTheme(),
      setTheme: (theme) => set({ theme }),
      toggle: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    { name: 'idgate.theme' },
  ),
)
