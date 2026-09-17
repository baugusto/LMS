"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { Button } from "@/web/components/ui/button";
import { Badge } from "@/web/components/ui/badge";
import { Card, CardContent } from "@/web/components/ui/card";
import { cn } from "@/web/lib/utils";
import { Check, Circle, Play, FileText, FileSpreadsheet, Image as ImageIcon, Link2, FileType, HelpCircle } from "lucide-react";
import { TrackVideoPlayer } from "@/web/components/lms/TrackVideoPlayer";
import { sanitizeHtml } from "@/web/lib/sanitizeHtml";
import { QuizPlayer } from "@/web/components/lms/QuizPlayer";

type TrackMaterialType =
  | "VIDEO"
  | "PDF"
  | "DOC"
  | "SLIDE"
  | "SHEET"
  | "IMAGE"
  | "LINK"
  | "QUIZ";

type TrackMaterial = {
  id: string;
  title: string;
  type: TrackMaterialType;
  url: string;
};

type TrackLesson = {
  id: string;
  title: string;
  description?: string;
  youtubeUrl: string;
  durationInMinutes?: number;
  type?: TrackMaterialType;
};

type TrackModule = {
  id: string;
  title: string;
  order: number;
  lessons: TrackLesson[];
};

type LessonProgress = {
  lessonId: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
};

type TrackProgress = {
  trackId: string;
  status: string;
  percentage: number;
  currentLessonId?: string;
  lessons: LessonProgress[];
};

type TrackDetailResponse = {
  track: {
    id: string;
    title: string;
    description?: string;
    partnershipProfiles: string[];
  };
  modules: TrackModule[];
  materials: TrackMaterial[];
  progress: TrackProgress | null;
};

const statusIcon = (status: string, isCurrent: boolean) => {
  if (isCurrent) return <Play className="w-4 h-4 text-blue-400" />;
  if (status === "COMPLETED")
    return <Check className="w-4 h-4 text-blue-400" />;
  if (status === "IN_PROGRESS")
    return <Circle className="w-4 h-4 text-blue-400" />;
  return <Circle className="w-4 h-4 text-muted-foreground" />;
};

export function TrackPlayer({ data }: { data: TrackDetailResponse }) {
  const flatLessons = useMemo(
    () =>
      data.modules
        .flatMap((m) =>
          m.lessons.map((l) => ({ ...l, moduleId: m.id, moduleTitle: m.title }))
        )
        .filter((l) => l.type === "QUIZ" || l.youtubeUrl),
    [data.modules]
  );

  const initialLessonId = data.progress?.currentLessonId ?? flatLessons[0]?.id;
  const [currentLessonId, setCurrentLessonId] = useState(initialLessonId);
  const [progress, setProgress] = useState<TrackProgress | null>(data.progress);
  const [videoPercent, setVideoPercent] = useState(progress?.percentage ?? 0);
  const [initialTimeSec, setInitialTimeSec] = useState(0);
  const [lastSentPercent, setLastSentPercent] = useState(0);
  const [lastTimeSec, setLastTimeSec] = useState(0);
  const [lastDurationSec, setLastDurationSec] = useState<number | undefined>(
    undefined
  );
  const [isCompleting, setIsCompleting] = useState(false);
  const currentLesson =
    flatLessons.find((l) => l.id === currentLessonId) ?? flatLessons[0];

  useEffect(() => {
    const loadVideoProgress = async () => {
      if (!currentLessonId || currentLesson?.type !== "VIDEO") {
        setInitialTimeSec(0);
        setLastTimeSec(0);
        setLastDurationSec(undefined);
        return;
      }
      try {
        const res = await fetch(
          `/api/lms/video-progress?learningPathId=${data.track.id}&resourceId=${currentLessonId}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const p = await res.json();
          setInitialTimeSec(p.currentTimeSec ?? 0);
          setVideoPercent(p.maxPercentViewed ?? 0);
          setLastSentPercent(p.maxPercentViewed ?? 0);
          setLastTimeSec(p.currentTimeSec ?? 0);
          setLastDurationSec(p.durationSec ?? undefined);
        } else {
          setInitialTimeSec(0);
          setVideoPercent(0);
          setLastSentPercent(0);
          setLastTimeSec(0);
          setLastDurationSec(undefined);
        }
      } catch {
        setInitialTimeSec(0);
        setLastTimeSec(0);
        setLastDurationSec(undefined);
      }
    };
    loadVideoProgress();
  }, [currentLessonId, data.track.id]);

  const markCompleted = async () => {
    if (!currentLesson) return;
    try {
      setIsCompleting(true);
      const isVideo = (currentLesson.type ?? "VIDEO") === "VIDEO";
      if (isVideo) {
        // primeiro salva progresso de vídeo como 100%
        const payload = {
          learningPathId: data.track.id,
          resourceId: currentLesson.id,
          currentTimeSec: lastDurationSec ?? lastTimeSec ?? 0,
          durationSec: lastDurationSec,
          percent: 100,
        };
        setVideoPercent(100);
        setLastSentPercent(100);
        await fetch("/api/lms/video-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      const res = await fetch(`/api/tracks/${data.track.id}/progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonId: currentLesson.id,
          status: "COMPLETED",
        }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar progresso");
      const json = await res.json();
      setProgress(json.progress);
      if (isVideo) {
        setVideoPercent(100);
        setLastSentPercent(100);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePercentChange = async (
    percent: number,
    currentTimeSec: number,
    durationSec?: number
  ) => {
    const newPercent = Math.max(videoPercent, percent);
    setVideoPercent(newPercent);
    setLastTimeSec(currentTimeSec);
    setLastDurationSec(durationSec);
    const effectivePercent = Math.max(lastSentPercent, newPercent);
    if (effectivePercent - lastSentPercent < 10 && effectivePercent !== 100)
      return;
    setLastSentPercent(effectivePercent);
    try {
      const res = await fetch("/api/lms/video-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          learningPathId: data.track.id,
          resourceId: currentLessonId,
          currentTimeSec,
          durationSec,
          percent: effectivePercent,
        }),
      });
      if (!res.ok) {
        console.error("Falha ao salvar progresso do vídeo", await res.text());
      }
    } catch (err) {
      console.error("Erro ao salvar progresso do vídeo", err);
    }
  };

  const progressMap = useMemo(() => {
    const map: Record<string, string> = {};
    progress?.lessons?.forEach((p) => {
      map[p.lessonId] = p.status;
    });
    return map;
  }, [progress]);

  const lessonIndex = flatLessons.findIndex((l) => l.id === currentLesson?.id);
  const prevLesson = lessonIndex > 0 ? flatLessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < flatLessons.length - 1
      ? flatLessons[lessonIndex + 1]
      : null;
  const currentLessonType = currentLesson?.type ?? "VIDEO";
  const isVideoLesson = currentLessonType === "VIDEO";
  const isQuizLesson = currentLessonType === "QUIZ";
  const currentLessonStatus =
    progressMap[currentLesson?.id ?? ""] ||
    (isVideoLesson && videoPercent >= 100 ? "COMPLETED" : undefined);
  const isCompleted = currentLessonStatus === "COMPLETED";
  const currentLessonPercent = isVideoLesson ? videoPercent : currentLessonStatus === "COMPLETED" ? 100 : 0;

  const lessonTypeMeta = (type: TrackMaterialType) => {
    switch (type) {
      case "PDF":
        return { label: "PDF", icon: <FileType className="w-10 h-10 text-red-400" />, accent: "bg-red-500/10 border-red-500/20" };
      case "DOC":
        return { label: "Documento", icon: <FileText className="w-10 h-10 text-blue-400" />, accent: "bg-blue-500/10 border-blue-500/20" };
      case "SLIDE":
        return { label: "Slide", icon: <FileText className="w-10 h-10 text-orange-400" />, accent: "bg-orange-500/10 border-orange-500/20" };
      case "SHEET":
        return { label: "Planilha", icon: <FileSpreadsheet className="w-10 h-10 text-green-400" />, accent: "bg-green-500/10 border-green-500/20" };
      case "IMAGE":
        return { label: "Imagem", icon: <ImageIcon className="w-10 h-10 text-purple-400" />, accent: "bg-purple-500/10 border-purple-500/20" };
      case "LINK":
        return { label: "Link", icon: <Link2 className="w-10 h-10 text-cyan-400" />, accent: "bg-cyan-500/10 border-cyan-500/20" };
      case "QUIZ":
        return { label: "Quiz", icon: <HelpCircle className="w-10 h-10 text-amber-400" />, accent: "bg-amber-500/10 border-amber-500/20" };
      default:
        return { label: "Arquivo", icon: <FileText className="w-10 h-10 text-muted-foreground" />, accent: "bg-muted/40 border-border/50" };
    }
  };
  const currentLessonMeta = lessonTypeMeta(currentLessonType);
  const resourceHref = !isQuizLesson ? currentLesson?.youtubeUrl ?? "" : "";
  const isDownloadableResource = !isVideoLesson && isDownloadableResourceUrl(resourceHref);
  const downloadName = isDownloadableResource
    ? isInternalDownloadUrl(resourceHref)
      ? fileNameFromDownloadUrl(resourceHref) ?? toDownloadName(currentLesson?.title, currentLessonType)
      : toDownloadName(currentLesson?.title, currentLessonType)
    : undefined;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6 overflow-visible">
      <div className="space-y-4 overflow-visible">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            <a href="/dashboard" className="hover:underline">
              Início
            </a>{" "}
            / {data.track.title}
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            {currentLesson?.title ?? data.track.title}
          </h1>
          <p className="text-sm text-muted-foreground">{data.track.title}</p>
        </div>

        <div className="rounded-2xl shadow-glow border border-border/50 bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 relative z-10">
          {isQuizLesson ? (
            <div className="p-6">
              <QuizPlayer
                key={currentLesson?.id ?? "quiz"}
                resourceId={currentLesson?.id ?? ""}
                trackId={data.track.id}
                onCompleted={async () => {
                  if (!currentLesson) return;
                  try {
                    const res = await fetch(`/api/tracks/${data.track.id}/progress`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ lessonId: currentLesson.id, status: "COMPLETED" }),
                    });
                    if (!res.ok) return;
                    const json = await res.json();
                    setProgress(json.progress);
                  } catch (err) {
                    console.error(err);
                  }
                }}
              />
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden aspect-video w-full h-full">
              {isVideoLesson ? (
                currentLesson?.youtubeUrl ? (
                  <TrackVideoPlayer
                    src={currentLesson.youtubeUrl}
                    title={currentLesson.title}
                    trackId={data.track.id}
                    lessonId={currentLesson.id}
                    initialProgressSeconds={initialTimeSec}
                    onPercentChange={handlePercentChange}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-foreground text-sm">
                    Vídeo não disponível
                  </div>
                )
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center gap-4 px-6">
                  <div className={`w-20 h-20 rounded-2xl border flex items-center justify-center ${currentLessonMeta.accent}`}>
                    {currentLessonMeta.icon}
                  </div>
                  <div className="space-y-1">
                    <div className="text-base font-semibold text-foreground">{currentLessonMeta.label}</div>
                    <div className="text-sm text-muted-foreground">{currentLesson?.title}</div>
                  </div>
                {resourceHref && (
                  <a
                    href={resourceHref}
                    {...(isDownloadableResource
                      ? {
                          download: downloadName,
                          ...(isDataResourceUrl(resourceHref)
                            ? { onClick: (event) => void handleLocalDownload(event, resourceHref, downloadName) }
                            : {}),
                        }
                      : { target: "_blank", rel: "noopener noreferrer" })}
                    className="text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
                  >
                    {isDownloadableResource ? "Baixar recurso" : "Abrir recurso em nova aba"}
                  </a>
                )}
                </div>
              )}
            </div>
          )}
        </div>

        <Card>
          <CardContent className="p-5 space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {currentLesson?.title}
                </h3>
              </div>
              <Badge variant="solid" className="text-xs">
                {currentLessonPercent ?? 0}% concluído
              </Badge>
            </div>

            <TabsArea
              description={
                currentLesson?.description ||
                data.track.description ||
                "Sem descrição"
              }
              materials={data.materials}
            />

            <div className="flex flex-wrap gap-2">
              {!isQuizLesson && (
                <Button
                  onClick={markCompleted}
                  disabled={isCompleting || isCompleted}
                  variant={isCompleted ? "secondary" : "default"}
                  className={cn(isCompleted && "opacity-70 cursor-default")}
                >
                  {isCompleted ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Concluída
                    </>
                  ) : isCompleting ? (
                    "Salvando..."
                  ) : (
                    "Marcar como concluída"
                  )}
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={!prevLesson}
                onClick={() => prevLesson && setCurrentLessonId(prevLesson.id)}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                disabled={!nextLesson}
                onClick={() => nextLesson && setCurrentLessonId(nextLesson.id)}
              >
                Próximo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardContent className="p-3 space-y-3 max-h-[60vh] lg:max-h-[720px] overflow-y-auto">
            {data.modules.map((module) => (
              <div key={module.id} className="space-y-2">
                <div className="text-sm font-semibold text-foreground">
                  {module.title}
                </div>
                <div className="space-y-1.5 pl-8">
                  {module.lessons.map((lesson) => {
                    const isCurrent = lesson.id === currentLessonId;
                    const status = progressMap[lesson.id] || "NOT_STARTED";
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setCurrentLessonId(lesson.id)}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-[16px] border border-border/50 px-3 py-2.5 text-left transition shadow-sm",
                          isCurrent
                            ? "bg-blue-500/20 border-blue-500/50 shadow-glow"
                            : "hover:border-blue-500/30 hover:bg-muted/50"
                        )}
                      >
                        <span>{statusIcon(status, isCurrent)}</span>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-foreground">
                            {lesson.title}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const handleLocalDownload = async (event: MouseEvent<HTMLAnchorElement>, url: string, filename?: string) => {
  if (!isDataResourceUrl(url)) return;
  event.preventDefault();
  event.stopPropagation();
  try {
    await downloadLocalResource(url, filename);
  } catch (err) {
    console.error("Erro ao baixar recurso", err);
  }
};

function TabsArea({
  description,
  materials,
}: {
  description?: string;
  materials: TrackMaterial[];
}) {
  const [tab, setTab] = useState<"description" | "materials">("description");
  const safeHtml = sanitizeHtml(description || "");
  const visibleMaterials = useMemo(
    () => materials.filter((m) => m.type !== "QUIZ"),
    [materials]
  );
  const iconForType = (type: TrackMaterialType) => {
    switch (type) {
      case "PDF":
        return "📄";
      case "SLIDE":
        return "🖥️";
      case "DOC":
        return "📝";
      case "SHEET":
        return "📊";
      case "IMAGE":
        return "🖼️";
      case "LINK":
        return "🔗";
      case "QUIZ":
        return "❓";
      default:
        return "📁";
    }
  };

  return (
    <div className="space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 p-1 shadow-card">
        <button
          className={cn(
            "px-3 py-1 text-sm rounded-full transition",
            tab === "description"
              ? "bg-muted/30 shadow text-foreground"
              : "text-muted-foreground"
          )}
          onClick={() => setTab("description")}
        >
          Descrição
        </button>
        <button
          className={cn(
            "px-3 py-1 text-sm rounded-full transition",
            tab === "materials"
              ? "bg-muted/30 shadow text-foreground"
              : "text-muted-foreground"
          )}
          onClick={() => setTab("materials")}
        >
          Materiais
        </button>
      </div>

      {tab === "description" ? (
        <div
          className="text-sm text-foreground leading-relaxed rich-content"
          dangerouslySetInnerHTML={{
            __html: safeHtml || "Nenhuma descrição disponível.",
          }}
        />
      ) : (
        <div className="space-y-2">
          {visibleMaterials.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum material disponível.
            </p>
          )}
          {visibleMaterials.map((m) => {
            const isDownloadable = isDownloadableResourceUrl(m.url);
            const download = isDownloadable
              ? isInternalDownloadUrl(m.url)
                ? fileNameFromDownloadUrl(m.url) ?? toDownloadName(m.title, m.type)
                : toDownloadName(m.title, m.type)
              : undefined;
            return (
            <a
              key={m.id}
              href={m.url}
              {...(isDownloadable
                ? {
                    download,
                    ...(isDataResourceUrl(m.url) ? { onClick: (event) => void handleLocalDownload(event, m.url, download) } : {}),
                  }
                : { target: "_blank", rel: "noopener noreferrer" })}
              className="flex items-center justify-between rounded-[14px] border border-border/50 px-3 py-2.5 text-sm hover:border-blue-500/50 hover:shadow-card-hover bg-muted/90"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{iconForType(m.type)}</span>
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{m.title}</span>
                  <span className="text-[12px] text-muted-foreground">{m.type}</span>
                </div>
              </div>
              <Badge variant="outline" className="text-[11px]">
                {m.type}
              </Badge>
            </a>
            )
          })}
        </div>
      )}
    </div>
  );
}

const isDataResourceUrl = (url: string) => url.startsWith("data:");
const isInternalDownloadUrl = (url: string) => {
  if (url.startsWith("/api/lms/resources/download/")) return true
  try {
    const parsed = new URL(url)
    return parsed.pathname.startsWith("/api/lms/resources/download/")
  } catch {
    return false
  }
}
const isDownloadableResourceUrl = (url: string) =>
  isDataResourceUrl(url) || isInternalDownloadUrl(url) || url.startsWith("blob:");

const fileNameFromDownloadUrl = (url: string) => {
  let fileKey = url.split("/").pop()
  if (url.startsWith("http")) {
    try {
      const parsed = new URL(url)
      fileKey = parsed.pathname.split("/").pop()
    } catch {
      fileKey = url.split("/").pop()
    }
  }
  if (!fileKey) return undefined
  const withUuidPrefix = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i
  if (withUuidPrefix.test(fileKey)) {
    return fileKey.replace(withUuidPrefix, "")
  }
  return fileKey
}

const resourceExtension: Record<TrackMaterialType, string> = {
  VIDEO: "mp4",
  PDF: "pdf",
  DOC: "docx",
  SLIDE: "pptx",
  SHEET: "xlsx",
  IMAGE: "png",
  LINK: "url",
  QUIZ: "quiz",
};

const toDownloadName = (title: string | undefined, type: TrackMaterialType) => {
  const base = (title ?? "recurso").trim() || "recurso";
  const safe = base.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 80);
  const ext = resourceExtension[type];
  if (!ext) return safe;
  const lowerSafe = safe.toLowerCase();
  return lowerSafe.endsWith(`.${ext}`) ? safe : `${safe}.${ext}`;
};

const downloadLocalResource = async (url: string, filename?: string) => {
  if (!isDataResourceUrl(url)) {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, filename);
    return;
  }

  const commaIndex = url.indexOf(",");
  if (commaIndex === -1) throw new Error("URL inválida");
  const meta = url.slice(5, commaIndex);
  const data = url.slice(commaIndex + 1);
  const isBase64 = meta.includes(";base64");
  const mimeType = meta.split(";")[0] || "application/octet-stream";
  let bytes: Uint8Array;

  if (isBase64) {
    const binary = atob(data);
    const len = binary.length;
    bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
  } else {
    const decoded = decodeURIComponent(data);
    bytes = new TextEncoder().encode(decoded);
  }

  const blob = new Blob([bytes as BlobPart], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  triggerDownload(objectUrl, filename);
};

const triggerDownload = (objectUrl: string, filename?: string) => {
  const link = document.createElement("a");
  link.href = objectUrl;
  if (filename) {
    link.download = filename;
  }
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};
