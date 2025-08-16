import { useEffect, useState, useRef } from "react"
import { ThemeProviderContext } from "@/contexts/theme-context"
import type { Theme } from "@/contexts/theme-context"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )

  // Track first render to avoid animating the initial paint
  const isFirstRender = useRef(true)

  // Inject a lightweight global transition style (only once)
  useEffect(() => {
    const STYLE_ID = "theme-transition-styles"
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style")
      style.id = STYLE_ID
      style.textContent = `
:root.theme-transition, 
:root.theme-transition * {
  transition: background-color .3s ease, color .3s ease, border-color .3s ease, fill .3s ease, stroke .3s ease;
}`
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement

    // Resolve "system" to an explicit theme first (no intermediate class removal)
    const resolvedTheme: Theme =
      theme === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : theme

    // Toggle only the necessary class instead of removing both first
    root.classList.toggle("dark", resolvedTheme === "dark")
    root.classList.toggle("light", resolvedTheme === "light")

    // After the first paint, enable smooth transitions for subsequent switches
    if (isFirstRender.current) {
      isFirstRender.current = false
    } else {
      root.classList.add("theme-transition")
    }
  }, [theme])

  const value = {
    theme,
    setTheme: (next: Theme) => {
      localStorage.setItem(storageKey, next)
      setTheme(next)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}


