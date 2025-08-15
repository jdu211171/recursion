import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "./components/ui/theme-toggle"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen w-full flex items-center justify-center">
        <ThemeToggle />
      </div>
    </ThemeProvider>
  )
}

export default App
