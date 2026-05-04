// Lightweight Discord-style markdown renderer.
// Supports: **bold**, *italic*, __underline__, ~~strike~~, `code`, ```block```,
//           > blockquote, links, @mentions, #channels, :emoji_aliases:, ||spoiler||
// Pure JSX — no external markdown dep.

import * as React from 'react'

type Node =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: Node[] }
  | { type: 'italic'; children: Node[] }
  | { type: 'underline'; children: Node[] }
  | { type: 'strike'; children: Node[] }
  | { type: 'spoiler'; children: Node[] }
  | { type: 'code'; value: string }
  | { type: 'codeblock'; value: string; lang?: string }
  | { type: 'link'; href: string; label: string }
  | { type: 'mention'; userId: string; label?: string }
  | { type: 'channel'; channelId: string; label?: string }
  | { type: 'emoji'; alias: string }
  | { type: 'br' }
  | { type: 'blockquote'; children: Node[] }

const EMOJI_ALIASES: Record<string, string> = {
  smile: '😄', laughing: '😆', joy: '😂', rofl: '🤣', wink: '😉', heart_eyes: '😍',
  kiss: '😘', tongue: '😛', thinking: '🤔', neutral: '😐', sob: '😭', cry: '😢',
  angry: '😠', rage: '😡', sleeping: '😴', sunglasses: '😎', heart: '❤️',
  thumbsup: '👍', thumbsdown: '👎', clap: '👏', wave: '👋', muscle: '💪',
  fire: '🔥', sparkles: '✨', tada: '🎉', star: '⭐', rocket: '🚀',
  eyes: '👀', '100': '💯', skull: '💀', pray: '🙏', ok_hand: '👌',
  pizza: '🍕', coffee: '☕', beer: '🍺', cake: '🎂', check: '✅', x: '❌',
}

function escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

// Parse inline content within a single line (no codeblocks or blockquotes).
function parseInline(text: string): Node[] {
  const out: Node[] = []
  let i = 0

  function pushText(t: string) { if (t) out.push({ type: 'text', value: t }) }

  while (i < text.length) {
    // ||spoiler||
    if (text.startsWith('||', i)) {
      const end = text.indexOf('||', i + 2)
      if (end !== -1) {
        out.push({ type: 'spoiler', children: parseInline(text.slice(i + 2, end)) })
        i = end + 2; continue
      }
    }
    // ```code``` (inline form, just rendered as block)
    if (text.startsWith('```', i)) {
      const end = text.indexOf('```', i + 3)
      if (end !== -1) {
        const inner = text.slice(i + 3, end)
        const nl = inner.indexOf('\n')
        let lang: string | undefined
        let code = inner
        if (nl !== -1 && nl <= 24 && /^[a-zA-Z0-9_+\-]+$/.test(inner.slice(0, nl))) {
          lang = inner.slice(0, nl)
          code = inner.slice(nl + 1)
        }
        out.push({ type: 'codeblock', value: code, lang })
        i = end + 3; continue
      }
    }
    // `inline code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1)
      if (end !== -1) {
        out.push({ type: 'code', value: text.slice(i + 1, end) })
        i = end + 1; continue
      }
    }
    // **bold**
    if (text.startsWith('**', i)) {
      const end = text.indexOf('**', i + 2)
      if (end !== -1) {
        out.push({ type: 'bold', children: parseInline(text.slice(i + 2, end)) })
        i = end + 2; continue
      }
    }
    // __underline__
    if (text.startsWith('__', i)) {
      const end = text.indexOf('__', i + 2)
      if (end !== -1) {
        out.push({ type: 'underline', children: parseInline(text.slice(i + 2, end)) })
        i = end + 2; continue
      }
    }
    // ~~strike~~
    if (text.startsWith('~~', i)) {
      const end = text.indexOf('~~', i + 2)
      if (end !== -1) {
        out.push({ type: 'strike', children: parseInline(text.slice(i + 2, end)) })
        i = end + 2; continue
      }
    }
    // *italic*  (single asterisk, no surrounding spaces required)
    if (text[i] === '*' && text[i + 1] !== '*') {
      const end = text.indexOf('*', i + 1)
      if (end !== -1 && end > i + 1) {
        out.push({ type: 'italic', children: parseInline(text.slice(i + 1, end)) })
        i = end + 1; continue
      }
    }
    // _italic_
    if (text[i] === '_' && text[i + 1] !== '_') {
      const end = text.indexOf('_', i + 1)
      if (end !== -1 && end > i + 1) {
        out.push({ type: 'italic', children: parseInline(text.slice(i + 1, end)) })
        i = end + 1; continue
      }
    }
    // <@uuid> mention
    const mentionMatch = /^<@([0-9a-fA-F-]{6,})>/.exec(text.slice(i))
    if (mentionMatch) {
      out.push({ type: 'mention', userId: mentionMatch[1] })
      i += mentionMatch[0].length; continue
    }
    // <#uuid> channel mention
    const chMatch = /^<#([0-9a-fA-F-]{6,})>/.exec(text.slice(i))
    if (chMatch) {
      out.push({ type: 'channel', channelId: chMatch[1] })
      i += chMatch[0].length; continue
    }
    // [label](url)
    const linkMatch = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/.exec(text.slice(i))
    if (linkMatch) {
      out.push({ type: 'link', label: linkMatch[1], href: linkMatch[2] })
      i += linkMatch[0].length; continue
    }
    // bare http(s) link
    const urlMatch = /^(https?:\/\/[^\s<>"'`]+)/.exec(text.slice(i))
    if (urlMatch) {
      out.push({ type: 'link', label: urlMatch[1], href: urlMatch[1] })
      i += urlMatch[0].length; continue
    }
    // :emoji_alias:
    const emojiMatch = /^:([a-z0-9_+\-]{1,32}):/i.exec(text.slice(i))
    if (emojiMatch && EMOJI_ALIASES[emojiMatch[1].toLowerCase()]) {
      out.push({ type: 'emoji', alias: emojiMatch[1].toLowerCase() })
      i += emojiMatch[0].length; continue
    }
    // plain char
    let j = i + 1
    while (
      j < text.length &&
      !'`*_~|<['.includes(text[j]) &&
      !text.startsWith('http', j) &&
      !text.startsWith(':', j)
    ) j++
    pushText(text.slice(i, j))
    i = j
  }
  return out
}

function parseBlocks(input: string): Node[] {
  // Extract triple-fence codeblocks first to avoid in-line interference.
  const blocks: Node[] = []
  let rest = input
  const re = /```([a-zA-Z0-9_+\-]*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  for (const m of rest.matchAll(re)) {
    const before = rest.slice(lastIndex, m.index)
    if (before) blocks.push(...parseLineRuns(before))
    blocks.push({ type: 'codeblock', value: m[2] ?? '', lang: m[1] || undefined })
    lastIndex = (m.index ?? 0) + m[0].length
  }
  if (lastIndex < rest.length) blocks.push(...parseLineRuns(rest.slice(lastIndex)))
  return blocks
}

function parseLineRuns(text: string): Node[] {
  const lines = text.split('\n')
  const out: Node[] = []
  let quoteBuf: string[] = []

  function flushQuote() {
    if (!quoteBuf.length) return
    out.push({ type: 'blockquote', children: parseInline(quoteBuf.join('\n')) })
    quoteBuf = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('> ')) { quoteBuf.push(line.slice(2)); continue }
    flushQuote()
    out.push(...parseInline(line))
    if (i < lines.length - 1) out.push({ type: 'br' })
  }
  flushQuote()
  return out
}

export interface RenderContext {
  resolveMention?: (userId: string) => string | undefined
  resolveChannel?: (channelId: string) => string | undefined
  onMentionClick?: (userId: string) => void
  onChannelClick?: (channelId: string) => void
}

function renderNode(n: Node, key: string, ctx: RenderContext): React.ReactNode {
  switch (n.type) {
    case 'text': return <React.Fragment key={key}>{n.value}</React.Fragment>
    case 'br':   return <br key={key} />
    case 'bold': return <strong key={key}>{n.children.map((c, i) => renderNode(c, `${key}.${i}`, ctx))}</strong>
    case 'italic': return <em key={key}>{n.children.map((c, i) => renderNode(c, `${key}.${i}`, ctx))}</em>
    case 'underline': return <u key={key}>{n.children.map((c, i) => renderNode(c, `${key}.${i}`, ctx))}</u>
    case 'strike': return <s key={key}>{n.children.map((c, i) => renderNode(c, `${key}.${i}`, ctx))}</s>
    case 'spoiler': return <Spoiler key={key}>{n.children.map((c, i) => renderNode(c, `${key}.${i}`, ctx))}</Spoiler>
    case 'code': return <code key={key}>{n.value}</code>
    case 'codeblock':
      return (
        <pre key={key}><code className={n.lang ? `lang-${n.lang}` : undefined}>{n.value}</code></pre>
      )
    case 'link':
      return <a key={key} href={n.href} target="_blank" rel="noopener noreferrer">{n.label}</a>
    case 'mention': {
      const label = ctx.resolveMention?.(n.userId) ?? 'unknown user'
      return (
        <span key={key} className="ds-mention" onClick={() => ctx.onMentionClick?.(n.userId)}>@{label}</span>
      )
    }
    case 'channel': {
      const label = ctx.resolveChannel?.(n.channelId) ?? 'channel'
      return (
        <span key={key} className="ds-mention" onClick={() => ctx.onChannelClick?.(n.channelId)}>#{label}</span>
      )
    }
    case 'emoji':
      return <span key={key}>{EMOJI_ALIASES[n.alias] ?? `:${n.alias}:`}</span>
    case 'blockquote':
      return <blockquote key={key}>{n.children.map((c, i) => renderNode(c, `${key}.${i}`, ctx))}</blockquote>
  }
}

function Spoiler({ children }: { children: React.ReactNode }) {
  const [revealed, setRevealed] = React.useState(false)
  return (
    <span
      className={`ds-spoiler ${revealed ? 'revealed' : ''}`}
      onClick={(e) => { e.stopPropagation(); setRevealed(true) }}
    >
      {children}
    </span>
  )
}

export interface MarkdownProps {
  text: string
  className?: string
  ctx?: RenderContext
}

export function Markdown({ text, className, ctx = {} }: MarkdownProps) {
  const nodes = React.useMemo(() => parseBlocks(text), [text])
  return (
    <div className={`ds-markdown whitespace-pre-wrap break-words ${className ?? ''}`}>
      {nodes.map((n, i) => renderNode(n, String(i), ctx))}
    </div>
  )
}

// Extract @uuid mentions from raw text (used server-side to populate mention rows)
export function extractMentions(text: string): string[] {
  const out = new Set<string>()
  for (const m of text.matchAll(/<@([0-9a-fA-F-]{6,})>/g)) out.add(m[1])
  return Array.from(out)
}

// Provide an exported emoji map for the picker
export { EMOJI_ALIASES }
export const COMMON_EMOJIS = Object.entries(EMOJI_ALIASES) as [string, string][]
