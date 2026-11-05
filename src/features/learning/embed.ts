/**
 * Turn a lesson's media link into something the player can show.
 *
 *  - YouTube / Vimeo / Cloudflare Stream → an embeddable iframe URL
 *  - direct .mp4/.webm/.mp3/... files    → native <video> / <audio>
 *  - PDFs                                  → inline viewer
 *  - anything else                         → a plain "open" link
 */
export type Embed =
  | { kind: 'iframe'; src: string }
  | { kind: 'video'; src: string }
  | { kind: 'audio'; src: string }
  | { kind: 'pdf'; src: string }
  | { kind: 'link'; src: string }

export function toEmbed(url: string): Embed {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { kind: 'link', src: url }
  }

  if (parsed.protocol !== 'https:') return { kind: 'link', src: url }

  const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '')
  const path = parsed.pathname

  // YouTube: watch?v=, youtu.be/, /shorts/, /embed/
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = parsed.searchParams.get('v') ?? path.match(/^\/(?:embed|shorts|live)\/([\w-]{6,})/)?.[1]
    if (id) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` }
  }
  if (host === 'youtu.be') {
    const id = path.slice(1).split('/')[0]
    if (id) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` }
  }

  // Vimeo: vimeo.com/123456789 or player.vimeo.com/video/123456789
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = path.match(/(\d{6,})/)?.[1]
    if (id) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` }
  }

  // Cloudflare Stream: customer-xxx.cloudflarestream.com/<id>/iframe (already embeddable) or /watch
  if (host.endsWith('cloudflarestream.com') || host === 'iframe.videodelivery.net') {
    return { kind: 'iframe', src: url.replace(/\/watch$/, '/iframe') }
  }

  const extension = path.split('.').pop()?.toLowerCase() ?? ''
  if (['mp4', 'webm', 'mov', 'm4v'].includes(extension)) return { kind: 'video', src: url }
  if (['mp3', 'm4a', 'wav', 'ogg', 'aac'].includes(extension)) return { kind: 'audio', src: url }
  if (extension === 'pdf') return { kind: 'pdf', src: url }

  return { kind: 'link', src: url }
}
