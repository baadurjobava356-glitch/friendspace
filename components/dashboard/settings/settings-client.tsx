"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  User, Shield, Bell, Save, LogOut, Eye, EyeOff, CheckCircle2, XCircle, Sun, Moon, Monitor,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  status: string | null
}

interface SettingsClientProps {
  user: SupabaseUser
  initialProfile: Profile | null
}

type FeedbackMsg = { type: "success" | "error"; text: string } | null

export function SettingsClient({ user, initialProfile }: SettingsClientProps) {
  const [profile, setProfile] = useState({
    displayName: initialProfile?.display_name || "",
    bio: initialProfile?.bio || "",
    status: initialProfile?.status || "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState<FeedbackMsg>(null)

  const [passwords, setPasswords] = useState({ newPass: "", confirm: "" })
  const [showPasswords, setShowPasswords] = useState({ newPass: false, confirm: false })
  const [isChangingPass, setIsChangingPass] = useState(false)
  const [passMsg, setPassMsg] = useState<FeedbackMsg>(null)
  const [passStrength, setPassStrength] = useState(0)

  const [theme, setTheme] = useState<"light" | "dark" | "system">("system")

  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [verificationMsg, setVerificationMsg] = useState<FeedbackMsg>(null)

  const router = useRouter()
  const supabase = createClient()

  function evaluatePasswordStrength(password: string): number {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }

  function getStrengthLabel(score: number): { label: string; color: string } {
    if (score <= 1) return { label: "Very weak", color: "bg-red-500" }
    if (score === 2) return { label: "Weak", color: "bg-orange-500" }
    if (score === 3) return { label: "Fair", color: "bg-yellow-500" }
    if (score === 4) return { label: "Strong", color: "bg-blue-500" }
    return { label: "Very strong", color: "bg-green-500" }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setProfileMsg(null)
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: profile.displayName,
        bio: profile.bio,
        status: profile.status,
      })
    setProfileMsg(error
      ? { type: "error", text: "Failed to save profile. Please try again." }
      : { type: "success", text: "Profile saved successfully!" }
    )
    setIsSaving(false)
    if (!error) router.refresh()
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassMsg(null)
    if (!passwords.newPass || passwords.newPass.length < 8) {
      setPassMsg({ type: "error", text: "Password must be at least 8 characters long." })
      return
    }
    if (passwords.newPass !== passwords.confirm) {
      setPassMsg({ type: "error", text: "New passwords do not match. Please try again." })
      return
    }
    if (passStrength < 2) {
      setPassMsg({ type: "error", text: "Password is too weak. Add uppercase letters, numbers, or symbols." })
      return
    }
    setIsChangingPass(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.newPass })
    if (error) {
      let msg = "Failed to change password."
      if (error.message.includes("same password")) msg = "New password must be different from your current password."
      else if (error.message.includes("weak")) msg = "Password is too weak. Choose a stronger password."
      else if (error.message.includes("session")) msg = "Session expired. Please sign in again."
      setPassMsg({ type: "error", text: msg })
    } else {
      setPassMsg({ type: "success", text: "Password changed successfully!" })
      setPasswords({ newPass: "", confirm: "" })
      setPassStrength(0)
    }
    setIsChangingPass(false)
  }

  function applyTheme(t: "light" | "dark" | "system") {
    setTheme(t)
    const root = document.documentElement
    if (t === "dark") root.classList.add("dark")
    else if (t === "light") root.classList.remove("dark")
    else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      prefersDark ? root.classList.add("dark") : root.classList.remove("dark")
    }
    localStorage.setItem("theme", t)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  async function handleResendVerification() {
    if (!user.email || isSendingVerification) return
    setIsSendingVerification(true)
    setVerificationMsg(null)
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      })
      const body = await res.json().catch(() => ({}))
      setVerificationMsg(res.ok
        ? { type: "success", text: "Verification email sent. Check your inbox." }
        : { type: "error", text: body?.error || "Verification request failed. Please try again." }
      )
    } catch (e) {
      setVerificationMsg({ type: "error", text: e instanceof Error ? e.message : "Unknown error" })
    } finally {
      setIsSendingVerification(false)
    }
  }

  const strength = getStrengthLabel(passStrength)
  const passwordsMatch = passwords.confirm && passwords.newPass === passwords.confirm
  const isEmailVerified = Boolean((user as any).email_confirmed_at)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" /><span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" /><span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" /><span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your profile details visible to other members</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold">
                      {profile.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{profile.displayName || "Set your name"}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
                      <Input id="displayName" value={profile.displayName}
                        onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                        placeholder="How should we call you?" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="status">Status</FieldLabel>
                      <Input id="status" value={profile.status}
                        onChange={(e) => setProfile({ ...profile, status: e.target.value })}
                        placeholder="What's on your mind?" maxLength={100} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="bio">Bio</FieldLabel>
                      <Textarea id="bio" value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell your friends about yourself..." rows={4} />
                    </Field>
                  </FieldGroup>
                  {profileMsg && (
                    <Alert className={profileMsg.type === "success"
                      ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                      : "border-destructive/50 bg-destructive/10 text-destructive"}>
                      <div className="flex items-center gap-2">
                        {profileMsg.type === "success"
                          ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                          : <XCircle className="w-4 h-4 shrink-0" />}
                        <AlertDescription>{profileMsg.text}</AlertDescription>
                      </div>
                    </Alert>
                  )}
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Spinner className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how FriendSpace looks for you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Monitor },
                  ] as const).map(({ value, label, icon: Icon }) => (
                    <button key={value} onClick={() => applyTheme(value)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        theme === value ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted"
                      }`}>
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Email Notifications", desc: "Receive email updates about messages and events" },
                  { title: "Push Notifications", desc: "Get notified in your browser" },
                  { title: "Message Sounds", desc: "Play sounds for new messages" },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Choose a strong, unique password to keep your account secure</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <Field>
                    <FieldLabel htmlFor="newPass">New Password</FieldLabel>
                    <div className="relative">
                      <Input id="newPass"
                        type={showPasswords.newPass ? "text" : "password"}
                        value={passwords.newPass}
                        onChange={(e) => {
                          setPasswords((p) => ({ ...p, newPass: e.target.value }))
                          setPassStrength(evaluatePasswordStrength(e.target.value))
                          setPassMsg(null)
                        }}
                        placeholder="Enter new password" className="pr-10" />
                      <button type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPasswords((p) => ({ ...p, newPass: !p.newPass }))}>
                        {showPasswords.newPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwords.newPass && (
                      <div className="mt-2 space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${
                              i <= passStrength ? strength.color : "bg-muted"
                            }`} />
                          ))}
                        </div>
                        <p className={`text-xs ${passStrength >= 4 ? "text-green-600 dark:text-green-400" : passStrength >= 3 ? "text-yellow-600" : "text-red-500"}`}>
                          {strength.label}
                        </p>
                      </div>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm">Confirm New Password</FieldLabel>
                    <div className="relative">
                      <Input id="confirm"
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwords.confirm}
                        onChange={(e) => { setPasswords((p) => ({ ...p, confirm: e.target.value })); setPassMsg(null) }}
                        placeholder="Confirm new password"
                        className={`pr-10 ${passwords.confirm
                          ? passwordsMatch ? "border-green-500 focus-visible:ring-green-500/30" : "border-red-500 focus-visible:ring-red-500/30"
                          : ""}`} />
                      <button type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}>
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwords.confirm && !passwordsMatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
                    {passwords.confirm && passwordsMatch && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </p>
                    )}
                  </Field>
                  {passMsg && (
                    <Alert className={passMsg.type === "success" ? "border-green-500/50 bg-green-500/10" : "border-destructive/50 bg-destructive/10"}>
                      <div className="flex items-start gap-2">
                        {passMsg.type === "success"
                          ? <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                          : <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />}
                        <AlertDescription className={passMsg.type === "success" ? "text-green-700 dark:text-green-400" : "text-destructive"}>
                          {passMsg.text}
                        </AlertDescription>
                      </div>
                    </Alert>
                  )}
                  <Button type="submit" disabled={isChangingPass || !passwords.newPass || !passwords.confirm || !passwordsMatch}>
                    {isChangingPass ? <><Spinner className="w-4 h-4 mr-2" />Changing…</> : <><Shield className="w-4 h-4 mr-2" />Update Password</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Security</CardTitle>
                <CardDescription>Manage your account security settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    {isEmailVerified ? (
                      <Button variant="outline" size="sm" disabled>Verified</Button>
                    ) : (
                      <Button variant="outline" size="sm" onClick={handleResendVerification} disabled={isSendingVerification}>
                        {isSendingVerification ? <><Spinner className="w-4 h-4 mr-2" />Sending…</> : "Resend Verification"}
                      </Button>
                    )}
                  </div>
                  {verificationMsg && (
                    <Alert className={verificationMsg.type === "success" ? "border-green-500/50 bg-green-500/10" : "border-destructive/50 bg-destructive/10"}>
                      <AlertDescription className={verificationMsg.type === "success" ? "text-green-700 dark:text-green-400" : "text-destructive"}>
                        {verificationMsg.text}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Button variant="outline" size="sm">Enable 2FA</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible account actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5">
                  <div>
                    <p className="font-medium">Sign Out</p>
                    <p className="text-sm text-muted-foreground">Sign out of your account on this device</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
