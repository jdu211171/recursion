/**
 * Theme context module.
 *
 * This file isolates the React Context from the ThemeProvider component file
 * to satisfy Fast Refresh requirements (a component file should ideally only
 * export React components) and to make the context reusable in hooks or tests.
 *
 * Usage:
 *   import { ThemeProviderContext } from "@/contexts/theme-context"
 *   const value = useContext(ThemeProviderContext)
 *
 * NOTE:
 *   Ensure that your ThemeProvider component imports and uses this context
 *   instead of creating a duplicate one, otherwise consumers will not
 *   receive the expected state.
 */
import { createContext } from "react"

export type Theme = "dark" | "light" | "system"

export interface ThemeProviderState {
  theme: Theme
  setTheme: (theme: Theme) => void
}

/**
 * Initial (safe) placeholder state. The real `setTheme` implementation
 * is supplied by the ThemeProvider.
 */
export const initialThemeState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

/**
 * React Context carrying the current theme and a setter.
 */
export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialThemeState)