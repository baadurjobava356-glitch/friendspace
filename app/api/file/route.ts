import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    const pathname = request.nextUrl.searchParams.get("pathname")

    if (!pathname) {
      return NextResponse.json({ error: "Missing pathname" }, { status: 400 })
    }

    const bucket = process.env.MINI_DISCORD_STORAGE_BUCKET ?? "discord-files"
    const admin = createAdminClient()
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(pathname, 120)

    if (error || !data?.signedUrl) {
      return new NextResponse("Not found", { status: 404 })
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json({ error: "Failed to serve file" }, { status: 500 })
  }
}
