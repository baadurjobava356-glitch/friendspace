import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const pathname = `shared/${Date.now()}-${safeName}`

    // Prefer Vercel Blob in production deployments; this avoids Supabase-admin env issues.
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(pathname, file, {
        access: "public",
        addRandomSuffix: true,
      })
      return NextResponse.json({ pathname: blob.url })
    }

    if (!process.env.SUPABASE_SECRET_KEY) {
      return NextResponse.json(
        { error: "Upload is not configured. Set BLOB_READ_WRITE_TOKEN or SUPABASE_SECRET_KEY." },
        { status: 503 },
      )
    }

    const bucket = process.env.MINI_DISCORD_STORAGE_BUCKET ?? "discord-files"
    const admin = createAdminClient()
    const bytes = new Uint8Array(await file.arrayBuffer())

    const { error } = await admin.storage.from(bucket).upload(pathname, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ pathname })
  } catch (error) {
    console.error("Upload error:", error)
    const message = error instanceof Error ? error.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
