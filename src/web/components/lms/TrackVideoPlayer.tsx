"use client"

import dynamic from "next/dynamic"
import { useEffect, useMemo, useRef, useState } from "react"
import { AlertCircle, ExternalLink } from "lucide-react"

const ReactPlayer = dynamic(() => import("react-player/lazy"), { ssr: false })

type TrackVideoPlayerProps = {
  src: string
  title: string
  trackId: string
  lessonId: string
  initialProgressSeconds?: number
  onPercentChange?: (percent: number, currentTimeSec: number, durationSec?: number) => void
}

export function TrackVideoPlayer({ src, title, initialProgressSeconds = 0, onPercentChange }: TrackVideoPlayerProps) {
  const playerRef = useRef<any>(null)
  const [hasSeeked, setHasSeeked] = useState(false)
  const [lastSentPercent, setLastSentPercent] = useState(0)
  const [videoError, setVideoError] = useState("")
  const normalizedSrc = useMemo(() => normalizeVideoUrl(src), [src])
  const fallbackHref = useMemo(() => toFallbackHref(src, normalizedSrc), [src, normalizedSrc])

  useEffect(() => {
    setHasSeeked(false)
    setLastSentPercent(0)
    setVideoError("")
  }, [normalizedSrc])

  const handleReady = () => {
    if (!hasSeeked && initialProgressSeconds > 0 && playerRef.current?.seekTo) {
      playerRef.current.seekTo(initialProgressSeconds, "seconds")
      setHasSeeked(true)
    }
  }

  const handleProgress = (state: { playedSeconds: number; loadedSeconds: number; played: number }) => {
    const duration = playerRef.current?.getDuration ? playerRef.current.getDuration() : 0
    const percent = duration > 0 ? Math.round((state.playedSeconds / duration) * 100) : 0
    onPercentChange?.(percent, Math.round(state.playedSeconds), Math.round(duration || 0))

    if ((percent - lastSentPercent >= 10) || percent === 100) {
      setLastSentPercent(percent)
    }
  }

  if (!normalizedSrc) {
    return (
      <div className="w-full aspect-video rounded-xl bg-muted/30 border border-border/50 flex flex-col items-center justify-center text-sm text-foreground px-4 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-muted-foreground" />
        <span>Link de vídeo inválido. Verifique o ID ou a URL.</span>
        {fallbackHref ? (
          <a 
            href={fallbackHref} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:text-blue-300 underline text-xs flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir vídeo em nova aba
          </a>
        ) : null}
      </div>
    )
  }

  if (videoError) {
    return (
      <div className="w-full aspect-video rounded-xl bg-muted/30 border border-border/50 flex flex-col items-center justify-center text-sm text-foreground px-4 text-center gap-3">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <span>{videoError}</span>
        {fallbackHref ? (
          <a 
            href={fallbackHref} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-blue-400 hover:text-blue-300 underline text-xs flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir vídeo em nova aba
          </a>
        ) : null}
      </div>
    )
  }

  return (
    <div className="w-full aspect-video rounded-xl overflow-hidden bg-black border border-border/30">
      <ReactPlayer
        ref={playerRef}
        url={normalizedSrc}
        width="100%"
        height="100%"
        controls
        onReady={handleReady}
        onError={() => setVideoError("Não foi possível carregar este vídeo. Verifique o link ou abra em nova aba.")}
        onProgress={handleProgress}
        config={{
          youtube: { playerVars: { rel: 0, modestbranding: 1 } },
          vimeo: { playerOptions: { controls: true } },
        }}
      />
    </div>
  )
}

const YOUTUBE_ID_REGEX = /^[A-Za-z0-9_-]{11}$/

const normalizeVideoUrl = (rawUrl: string) => {
  const trimmed = rawUrl.trim()
  if (!trimmed) return ""

  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return `https://www.youtube.com/watch?v=${trimmed}`
  }

  let url = trimmed
  if (/^www\./i.test(url)) {
    url = `https://${url}`
  }

  const youtubeId = extractYoutubeId(url)
  if (youtubeId) {
    return `https://www.youtube.com/watch?v=${youtubeId}`
  }

  const isYoutube = /youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(url)
  if (isYoutube) return ""

  return url
}

const extractYoutubeId = (url: string) => {
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/,
    /youtube(?:-nocookie)?\.com\/watch\?.*v=([A-Za-z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return ""
}

const toFallbackHref = (rawUrl: string, normalizedUrl: string) => {
  if (normalizedUrl) return normalizedUrl
  const trimmed = rawUrl.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`
  return ""
}
