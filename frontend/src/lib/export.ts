import type { Minutes } from '../types'

function list(items: string[]): string {
  return items.length ? items.map((i) => `- ${i}`).join('\n') : '_None_'
}

export function minutesToMarkdown(m: Minutes): string {
  const meta = [
    m.date ? `**Date:** ${m.date}` : null,
    m.location ? `**Location:** ${m.location}` : null,
    m.attendees.length ? `**Attendees:** ${m.attendees.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('  \n')

  const actions = m.action_items.length
    ? m.action_items.map((a) => `- **${a.owner}** — ${a.task}`).join('\n')
    : '_None_'

  return `# ${m.title}

${meta}

## Summary
${m.summary || '_None_'}

## Discussion Points
${list(m.discussion_points)}

## Key Decisions
${list(m.key_decisions)}

## Takeaways
${list(m.takeaways)}

## Action Items
${actions}

## Insights
**Sentiment:** ${m.sentiment.overall}${m.sentiment.note ? ` — ${m.sentiment.note}` : ''}

**Topics:** ${m.topics.length ? m.topics.join(', ') : '_None_'}
`
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function htmlList(items: string[]): string {
  if (!items.length) return '<p><em>None</em></p>'
  return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
}

export function minutesToHtml(m: Minutes): string {
  const actions = m.action_items.length
    ? `<ul>${m.action_items
        .map((a) => `<li><strong>${esc(a.owner)}</strong> — ${esc(a.task)}</li>`)
        .join('')}</ul>`
    : '<p><em>None</em></p>'

  return `
    <style>
      body { font-family: "Plus Jakarta Sans", -apple-system, Segoe UI, Roboto, sans-serif; color: #1A1917; max-width: 700px; margin: 48px auto; padding: 0 24px; line-height: 1.6; }
      h1 { font-family: Georgia, "Times New Roman", serif; font-size: 30px; margin: 0 0 6px; letter-spacing: -0.01em; }
      h2 { font-family: Georgia, "Times New Roman", serif; font-size: 18px; margin: 30px 0 8px; padding-top: 20px; border-top: 1px solid #DEDCD5; }
      ul { padding-left: 20px; } li { margin: 4px 0; }
      .meta { color: #6E6B63; font-size: 14px; border-bottom: 2px solid #0E9366; display: inline-block; padding-bottom: 8px; }
      em { color: #9A968D; }
    </style>
    <h1>${esc(m.title)}</h1>
    <p class="meta">
      ${m.date ? `Date: ${esc(m.date)} · ` : ''}
      ${m.location ? `Location: ${esc(m.location)} · ` : ''}
      ${m.attendees.length ? `Attendees: ${esc(m.attendees.join(', '))}` : ''}
    </p>
    <h2>Summary</h2><p>${esc(m.summary) || '<em>None</em>'}</p>
    <h2>Discussion Points</h2>${htmlList(m.discussion_points)}
    <h2>Key Decisions</h2>${htmlList(m.key_decisions)}
    <h2>Takeaways</h2>${htmlList(m.takeaways)}
    <h2>Action Items</h2>${actions}
    <h2>Insights</h2>
    <p><strong>Sentiment:</strong> ${esc(m.sentiment.overall)}${m.sentiment.note ? ` — ${esc(m.sentiment.note)}` : ''}</p>
    <p><strong>Topics:</strong> ${m.topics.length ? esc(m.topics.join(', ')) : '<em>None</em>'}</p>
  `
}

export async function copyMarkdown(m: Minutes): Promise<void> {
  await navigator.clipboard.writeText(minutesToMarkdown(m))
}

export function downloadMarkdown(m: Minutes): void {
  const blob = new Blob([minutesToMarkdown(m)], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const slug =
    m.title
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'meeting-minutes'
  a.download = `${slug}.md`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadPdf(m: Minutes): void {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(
    `<!doctype html><html><head><title>${esc(m.title)}</title></head><body>${minutesToHtml(m)}</body></html>`,
  )
  win.document.close()
  win.focus()
  let printed = false
  const trigger = () => {
    if (printed) return
    printed = true
    win.print()
  }
  win.onload = trigger
  setTimeout(trigger, 400)
}
