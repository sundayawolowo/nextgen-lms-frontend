import { ExternalLink, Radio } from 'lucide-react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Alert } from '../../components/ui'
import type { PlayerLesson } from '../../types/learning'
import { toEmbed } from './embed'

/**
 * Shows one lesson's content. Text lessons are Markdown rendered by react-markdown,
 * which does not render raw HTML, so instructor content can't inject scripts.
 */
export function LessonContent({ lesson }: { lesson: Pick<PlayerLesson, 'title' | 'content_type' | 'body' | 'media_url' | 'summary'> }) {
  if (lesson.content_type === 'text') {
    return (
      <article className="prose-lesson">
        {lesson.body ? <Markdown remarkPlugins={[remarkGfm]}>{lesson.body}</Markdown> : <p className="text-slate-500">This lesson has no content yet.</p>}
      </article>
    )
  }

  if (lesson.content_type === 'live') {
    return (
      <Alert title="Live session">
        <p className="flex items-center gap-2">
          <Radio className="size-4" aria-hidden /> Live classes arrive in a later release. Your instructor will share the joining details.
        </p>
      </Alert>
    )
  }

  if (!lesson.media_url) {
    return <Alert tone="warning">The instructor hasn't added the media for this lesson yet.</Alert>
  }

  const embed = toEmbed(lesson.media_url)

  return (
    <div className="space-y-4">
      {embed.kind === 'iframe' && (
        <div className="aspect-video overflow-hidden rounded-xl bg-black shadow">
          <iframe
            src={embed.src}
            title={lesson.title}
            className="size-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}
      {embed.kind === 'video' && (
        <video src={embed.src} controls className="aspect-video w-full rounded-xl bg-black shadow" controlsList="nodownload">
          <track kind="captions" />
        </video>
      )}
      {embed.kind === 'audio' && <audio src={embed.src} controls className="w-full" />}
      {embed.kind === 'pdf' && <iframe src={embed.src} title={lesson.title} className="h-[75vh] w-full rounded-xl border border-slate-200 bg-white" />}
      {(embed.kind === 'link' || embed.kind === 'pdf') && (
        <a href={embed.src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline">
          <ExternalLink className="size-4" /> Open in a new tab
        </a>
      )}
      {lesson.summary && <p className="text-sm text-slate-600">{lesson.summary}</p>}
    </div>
  )
}
