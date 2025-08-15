/**
 * Dedicated hook file extracted from the previous inline definition inside theme-provider.tsx.
 *
 * IMPORTANT:
 * For this hook to work, ensure that `ThemeProviderContext` is exported from
 * `@/contexts/theme-context`.
 *
 * Example adjustment in theme-provider.tsx (not done automatically here):
 *   export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)
 *
 * This separation keeps the provider lean and allows the hook to be tree‑shaken or
 * mocked in tests independently.
 */

import { useContext } from "react"
// Import path updated to reflect separated context location "@/contexts/*"
import { ThemeProviderContext } from "@/contexts/theme-context"

export type Theme = "dark" | "light" | "system"

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/**
 * useTheme
 * Access the current theme and a setter supplied by <ThemeProvider />.
 * Throws if used outside the provider to surface integration mistakes early.
 */
export function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext as unknown as React.Context<ThemeProviderState>)

  if (context === undefined || context === null) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}

export default useTheme