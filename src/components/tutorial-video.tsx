import { useState } from "react"
import { ExternalLink, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { HAS_TUTORIAL, TUTORIAL } from "@/lib/config"

/**
 * Hidden when no link is configured in .env.
 * - embed link set: play-to-load player (nothing loads until Play is clicked)
 * - only the open link set: a single "Watch the tutorial" button that opens the video in a new tab
 */
export function TutorialVideo() {
  const [playing, setPlaying] = useState(false)
  if (!HAS_TUTORIAL) return null

  const canEmbed = Boolean(TUTORIAL.embedUrl)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Play className="size-5 text-primary" /> {TUTORIAL.title}
          </span>
          {canEmbed && TUTORIAL.openUrl && (
            <Button asChild variant="ghost" size="sm">
              <a href={TUTORIAL.openUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Open in new tab
              </a>
            </Button>
          )}
        </CardTitle>
        <CardDescription>{TUTORIAL.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {canEmbed ? (
          <>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-muted">
              {playing ? (
                <iframe
                  src={TUTORIAL.embedUrl}
                  title="Tutorial video"
                  className="absolute inset-0 size-full"
                  allowFullScreen
                  allow="autoplay; fullscreen"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setPlaying(true)}
                  className="group absolute inset-0 flex flex-col items-center justify-center gap-3 outline-none hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  aria-label="Play the tutorial video"
                >
                  <span className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105">
                    <Play className="size-7 translate-x-0.5" />
                  </span>
                  <span className="text-sm font-medium">Play tutorial</span>
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              You need to be signed in to your work account to watch.
              {TUTORIAL.openUrl ? " Video not loading? Use Open in new tab." : ""}
            </p>
          </>
        ) : (
          <Button asChild>
            <a href={TUTORIAL.openUrl} target="_blank" rel="noopener noreferrer">
              <Play /> Watch the tutorial
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
