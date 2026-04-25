const MB = 1024 * 1024

export const miniDiscordConfig = {
  file: {
    maxBytes: Number(process.env.MINI_DISCORD_MAX_FILE_BYTES ?? 10 * MB),
    maxStoragePerGroupBytes: Number(
      process.env.MINI_DISCORD_MAX_STORAGE_PER_GROUP_BYTES ?? 250 * MB,
    ),
    allowedMimePrefixes: ['image/', 'video/', 'audio/', 'application/pdf', 'text/'],
  },
  voice: {
    maxParticipantsPerRoom: Number(
      process.env.MINI_DISCORD_MAX_VOICE_PARTICIPANTS ?? 12,
    ),
  },
}

export function isAllowedMimeType(mime: string) {
  return miniDiscordConfig.file.allowedMimePrefixes.some((allowed) =>
    mime.startsWith(allowed),
  )
}
