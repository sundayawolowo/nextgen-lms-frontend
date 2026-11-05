import { describe, expect, it } from 'vitest'
import { toEmbed } from './embed'

describe('toEmbed', () => {
  it('embeds YouTube links in every common form, privacy-enhanced', () => {
    const expected = { kind: 'iframe', src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0' }
    expect(toEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual(expected)
    expect(toEmbed('https://youtu.be/dQw4w9WgXcQ')).toEqual(expected)
    expect(toEmbed('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30')).toEqual(expected)
    expect(toEmbed('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toEqual(expected)
  })

  it('embeds Vimeo', () => {
    expect(toEmbed('https://vimeo.com/123456789')).toEqual({ kind: 'iframe', src: 'https://player.vimeo.com/video/123456789' })
  })

  it('uses native players for direct files', () => {
    expect(toEmbed('https://cdn.example.com/intro.mp4').kind).toBe('video')
    expect(toEmbed('https://cdn.example.com/sermon.mp3').kind).toBe('audio')
    expect(toEmbed('https://cdn.example.com/notes.pdf').kind).toBe('pdf')
  })

  it('never embeds plain http or unknown sites', () => {
    expect(toEmbed('http://youtube.com/watch?v=dQw4w9WgXcQ').kind).toBe('link')
    expect(toEmbed('https://example.com/page').kind).toBe('link')
    expect(toEmbed('not a url').kind).toBe('link')
  })
})
