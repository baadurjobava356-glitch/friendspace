"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel, FieldError } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Users, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // If a valid session already exists, skip this screen.
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) {
        window.location.replace("/discord")
      }
    })

    return () => {
      mounted = false
    }
  }, [supabase.auth])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
      return
    }

    // Force a full navigation so Server Components read fresh auth cookies/session.
    window.location.assign("/discord")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ds-bg-tertiary p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-ds-blurple flex items-center justify-center shadow-lg shadow-ds-blurple/30">
              <Users className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-ds-interactive-active tracking-tight">FriendSpace</span>
          </div>
          <p className="text-ds-text-muted text-center">Welcome back</p>
        </div>

        <Card className="bg-ds-bg-secondary border border-ds-divider/60 shadow-2xl rounded-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-[22px] text-center text-ds-interactive-active tracking-tight">Sign in</CardTitle>
            <CardDescription className="text-center text-ds-text-muted">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </Field>
              </FieldGroup>

              {error && (
                <FieldError className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                  {error}
                </FieldError>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Spinner className="w-4 h-4" />
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <div className="mb-2">
                <Link href="/auth/forgot-password" className="text-primary hover:underline font-medium">
                  Forgot your password?
                </Link>
              </div>
              <span className="text-muted-foreground">{"Don't have an account? "}</span>
              <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
