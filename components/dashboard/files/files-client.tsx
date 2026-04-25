"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import {
  Upload,
  FolderOpen,
  File,
  Image,
  FileText,
  Film,
  Music,
  MoreVertical,
  Download,
  Trash2,
  Search,
  Grid,
  List,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Profile {
  id: string
  display_name: string | null
}

interface SharedFile {
  id: string
  name: string
  file_path: string
  file_size: number | null
  file_type: string | null
  uploaded_by: string
  folder: string
  created_at: string
}

interface FilesClientProps {
  currentUserId: string
  initialFiles: SharedFile[]
  allProfiles: Profile[]
}

// ─── Upload feedback ──────────────────────────────────────────────────────────
type UploadStatus = "idle" | "uploading" | "success" | "error"

interface UploadFeedback {
  status: UploadStatus
  message: string
}

function getFileIcon(fileType: string | null) {
  if (!fileType) return File
  if (fileType.startsWith("image/")) return Image
  if (fileType.startsWith("video/")) return Film
  if (fileType.startsWith("audio/")) return Music
  if (fileType.includes("pdf") || fileType.includes("document") || fileType.includes("text")) return FileText
  return File
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "Unknown size"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function FilesClient({
  currentUserId,
  initialFiles,
  allProfiles,
}: FilesClientProps) {
  const [files, setFiles] = useState<SharedFile[]>(initialFiles)
  const [isUploading, setIsUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [dragActive, setDragActive] = useState(false)
  const [uploadFeedback, setUploadFeedback] = useState<UploadFeedback>({ status: "idle", message: "" })
  const supabase = createClient()

  function showFeedback(status: UploadStatus, message: string) {
    setUploadFeedback({ status, message })
    if (status === "success" || status === "error") {
      setTimeout(() => setUploadFeedback({ status: "idle", message: "" }), 4000)
    }
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files)
    }
  }, [])

  async function handleFiles(fileList: FileList) {
    setIsUploading(true)
    showFeedback("uploading", `Uploading ${fileList.length} file${fileList.length > 1 ? "s" : ""}…`)

    let successCount = 0
    const errors: string[] = []

    for (const file of Array.from(fileList)) {
      try {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          // Surface server-side error message if available
          let errMsg = `Upload failed for "${file.name}"`
          try {
            const body = await response.json()
            if (body?.error) errMsg = body.error
            if (body?.debugLogPath) {
              errMsg += ` (debugLogPath: ${Array.isArray(body.debugLogPath) ? body.debugLogPath.join(", ") : body.debugLogPath})`
            }
          } catch { /* ignore parse errors */ }
          errors.push(errMsg)
          continue
        }

        const json = await response.json()
        const pathname: string | undefined = json?.pathname

        if (!pathname) {
          const debug = json?.debugLogPath
          errors.push(`No path returned for "${file.name}"${debug ? ` (debugLogPath: ${Array.isArray(debug) ? debug.join(", ") : debug})` : ""}`)
          continue
        }

        const { data, error: dbError } = await supabase
          .from("shared_files")
          .insert({
            name: file.name,
            file_path: pathname,
            file_size: file.size,
            file_type: file.type,
            uploaded_by: currentUserId,
            folder: "general",
          })
          .select()
          .single()

        if (dbError || !data) {
          errors.push(`Saved to storage but failed to record "${file.name}"`)
          continue
        }

        setFiles((prev) => [data, ...prev])
        successCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        errors.push(`"${file.name}": ${msg}`)
        console.error("Upload failed:", err)
      }
    }

    setIsUploading(false)

    if (errors.length === 0) {
      showFeedback("success", `${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully`)
    } else if (successCount > 0) {
      showFeedback("error", `${successCount} uploaded, ${errors.length} failed: ${errors[0]}`)
    } else {
      showFeedback("error", errors[0] || "Upload failed. Check BLOB_READ_WRITE_TOKEN in .env.local")
    }
  }

  async function deleteFile(file: SharedFile) {
    try {
      await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: file.file_path }),
      })

      await supabase.from("shared_files").delete().eq("id", file.id)
      setFiles((prev) => prev.filter((f) => f.id !== file.id))
    } catch (error) {
      console.error("Delete failed:", error)
      showFeedback("error", "Failed to delete file. Please try again.")
    }
  }

  function getProfileById(id: string) {
    return allProfiles.find((p) => p.id === id)
  }

  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const feedbackIcon = {
    uploading: <Spinner className="w-4 h-4" />,
    success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    error: <XCircle className="w-4 h-4 text-destructive" />,
    idle: null,
  }[uploadFeedback.status]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Files</h1>
          <p className="text-muted-foreground">Share files with your group</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64"
            />
          </div>
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Upload feedback banner */}
      {uploadFeedback.status !== "idle" && (
        <div
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm",
            uploadFeedback.status === "success" && "bg-green-500/10 text-green-700 dark:text-green-400",
            uploadFeedback.status === "error" && "bg-destructive/10 text-destructive",
            uploadFeedback.status === "uploading" && "bg-muted text-muted-foreground"
          )}
        >
          {feedbackIcon}
          <span>{uploadFeedback.message}</span>
        </div>
      )}

      {/* Upload Area */}
      <Card
        className={cn(
          "mb-6 border-2 border-dashed transition-colors",
          dragActive ? "border-primary bg-primary/5" : "border-border"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center text-center">
            {isUploading ? (
              <>
                <Spinner className="w-10 h-10 mb-4" />
                <p className="font-medium">Uploading files…</p>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                <p className="font-medium mb-1">Drag and drop files here</p>
                <p className="text-sm text-muted-foreground mb-4">or click to browse</p>
                <label>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => e.target.files && handleFiles(e.target.files)}
                  />
                  <Button variant="outline" asChild>
                    <span className="cursor-pointer">Browse Files</span>
                  </Button>
                </label>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="font-medium text-lg mb-1">No files yet</h3>
          <p className="text-sm">Upload files to share with your group</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.file_type)
            const uploader = getProfileById(file.uploaded_by)
            const isImage = file.file_type?.startsWith("image/")

            return (
              <Card key={file.id} className="group relative overflow-hidden">
                <CardContent className="p-4">
                  <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center mb-3 overflow-hidden">
                    {isImage ? (
                      <img
                        src={`/api/file?pathname=${encodeURIComponent(file.file_path)}`}
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileIcon className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <p className="font-medium text-sm truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.file_size)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    by {uploader?.display_name || "Unknown"}
                  </p>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a
                          href={`/api/file?pathname=${encodeURIComponent(file.file_path)}`}
                          download={file.name}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </a>
                      </DropdownMenuItem>
                      {file.uploaded_by === currentUserId && (
                        <DropdownMenuItem
                          onClick={() => deleteFile(file)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filteredFiles.map((file) => {
                const FileIcon = getFileIcon(file.file_type)
                const uploader = getProfileById(file.uploaded_by)

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileIcon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)} • Uploaded by {uploader?.display_name || "Unknown"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {new Date(file.created_at).toLocaleDateString()}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <a
                            href={`/api/file?pathname=${encodeURIComponent(file.file_path)}`}
                            download={file.name}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </a>
                        </DropdownMenuItem>
                        {file.uploaded_by === currentUserId && (
                          <DropdownMenuItem
                            onClick={() => deleteFile(file)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
