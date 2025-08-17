"use client"

import type React from "react"

import { useState } from "react"
import { GalleryVerticalEnd, ArrowLeft } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const testUsers = ["john@example.com", "jane@example.com", "admin@acme.com", "user@test.com"]; const DEFAULT_TEST_PASSWORD = "test1234"

interface LoginFormProps extends React.ComponentProps<"div"> {
  onAuthenticated?: () => void
}

export function LoginForm({ className, onAuthenticated, ...props }: LoginFormProps) {
  const [step, setStep] = useState<"email" | "password">("email")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isValidEmail, setIsValidEmail] = useState(false); const [error, setError] = useState<string | null>(null)

  const validateEmail = (emailValue: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(emailValue)
  }

  const userExists = (emailValue: string) => {
    return testUsers.includes(emailValue.toLowerCase())
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidEmail && userExists(email)) {
      setError(null)
      setStep("password")
    }
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === DEFAULT_TEST_PASSWORD) {
      console.log("Auth success:", { email })
      setError(null)
      onAuthenticated?.()
    } else {
      setError(`Invalid password. Use test password: ${DEFAULT_TEST_PASSWORD}`)
    }
    // Demo-only password check above
  }

  const handleBack = () => {
    setStep("email")
    setPassword("")
    setError(null)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setIsValidEmail(validateEmail(value))
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={step === "email" ? handleEmailSubmit : handlePasswordSubmit}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2">
            {/* Back button container - always rendered to prevent layout shift */}
            <div className="w-full h-10 mb-2">
              <div
                className={cn(
                  "flex justify-start transition-opacity duration-300",
                  step === "password" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
              >
                <Button type="button" variant="ghost" size="sm" onClick={handleBack} className="p-2">
                  <ArrowLeft className="size-4" />
                </Button>
              </div>
            </div>
            <a href="#" className="flex flex-col items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md">
                <GalleryVerticalEnd className="size-6" />
              </div>
              <span className="sr-only">Acme Inc.</span>
            </a>
            <h1 className="text-xl font-bold">Welcome to Acme Inc.</h1>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <a href="#" className="underline underline-offset-4">
                Sign up
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Animated field swap container */}
            <div className="relative h-[92px]">
              {/* Email step layer */}
              <div
                className={cn(
                  "grid gap-3 absolute inset-0 transition-opacity duration-300",
                  step === "email" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                aria-hidden={step !== "email"}
              >
                <Label htmlFor="email-input" className="transition-all duration-300 ease-out">
                  Email
                </Label>
                <Input
                  id="email-input"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  className="transition-all duration-300 ease-out"
                />
              </div>

              {/* Password step layer */}
              <div
                className={cn(
                  "grid gap-3 absolute inset-0 transition-opacity duration-300",
                  step === "password" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                aria-hidden={step !== "password"}
              >
                <Label htmlFor="password-input" className="transition-all duration-300 ease-out">
                  Enter your password
                </Label>
                <Input
                  id="password-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (error) setError(null)
                  }}
                  required
                  autoFocus
                  className="transition-all duration-300 ease-out"
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={step === "email" ? !isValidEmail || !userExists(email) : !password}
            >
              Continue
            </Button>
          </div>

            {/* Social auth buttons & divider are always visible to prevent layout shift between steps */}
          <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">Or</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Button variant="outline" type="button" size="lg" className="w-full bg-transparent">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4 rounded-sm bg-[#06C755] p-0.5">
                <path
                  d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.628-.629.628M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
                  fill="#FFFFFF"
                />
              </svg>
              Login with LINE
            </Button>

            <Button variant="outline" type="button" size="lg" className="w-full bg-transparent">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-4" role="img" aria-label="Google">
                <path fill="#4285F4" d="M23.754 12.276c0-.851-.076-1.66-.218-2.427H12.24v4.597h6.46c-.278 1.5-1.115 2.773-2.388 3.623v3.017h3.845c2.252-2.073 3.597-5.125 3.597-8.81z" />
                <path fill="#34A853" d="M12.24 24c3.24 0 5.951-1.073 7.934-2.914l-3.845-3.017c-1.073.72-2.444 1.152-4.089 1.152-3.146 0-5.814-2.123-6.772-4.973H1.47v3.104C3.444 21.316 7.533 24 12.24 24z" />
                <path fill="#FBBC05" d="M5.468 14.248c-.24-.72-.378-1.49-.378-2.248s.138-1.528.378-2.248V6.648H1.47A11.96 11.96 0 0 0 .24 12c0 1.927.462 3.744 1.23 5.352l4-3.104z" />
                <path fill="#EA4335" d="M12.24 4.748c1.764 0 3.34.607 4.586 1.8l3.43-3.43C18.191 1.23 15.48 0 12.24 0 7.533 0 3.444 2.684 1.47 6.648l3.998 3.104c.958-2.85 3.626-4.998 6.772-4.998z" />
              </svg>
              Login with Google
            </Button>
          </div>
        </div>
      </form>

      {/* Footer is always visible to avoid content jumping between steps */}
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        By clicking continue, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
      </div>
    </div>
  )
}
