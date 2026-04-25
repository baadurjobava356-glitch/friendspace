"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const body = await res.json().catch(() => null) as { error?: string } | null
    if (!res.ok) {
      setError(body?.error ?? "Failed to send reset email")
      setIsLoading(false)
      return
    }
    setSuccess("Password reset email sent. Check your inbox.")
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card className="border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Reset password</CardTitle>
            <CardDescription className="text-center">
              Enter your email and we will send a secure reset link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                  />
                </Field>
              </FieldGroup>
              {error && <FieldError className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</FieldError>}
              {success && <p className="text-sm text-green-700 bg-green-500/10 p-3 rounded-lg">{success}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Spinner className="w-4 h-4" /> : "Send reset email"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              <Link href="/auth/login" className="text-primary hover:underline font-medium">Back to login</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
