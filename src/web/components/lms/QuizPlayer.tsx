"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/web/components/ui/button"
import { Input } from "@/web/components/ui/input"
import { Card, CardContent } from "@/web/components/ui/card"
import { sanitizeHtml } from "@/web/lib/sanitizeHtml"

type QuizQuestionType = "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" | "SINGLE_CHOICE"

type QuizOption = {
  id: string
  order: number
  text: string
}

type QuizQuestion = {
  id: string
  order: number
  prompt: string
  type: QuizQuestionType
  options?: QuizOption[]
}

type QuizAttemptResult = {
  percent: number
  score: number
  totalQuestions: number
  correctAnswers: number
}

type QuizPayload = {
  quizId: string
  title: string
  questions: QuizQuestion[]
  hasAttempt: boolean
  attempt?: QuizAttemptResult
}

type QuizAnswer = {
  questionId: string
  type: QuizQuestionType
  textAnswer?: string
  optionIds?: string[]
}

type QuizPlayerProps = {
  resourceId: string
  trackId: string
  onCompleted?: () => Promise<void> | void
}

const questionLabel: Record<QuizQuestionType, string> = {
  SHORT_TEXT: "Resposta curta",
  LONG_TEXT: "Resposta longa",
  MULTIPLE_CHOICE: "Múltipla escolha",
  SINGLE_CHOICE: "Escolha única",
}

export function QuizPlayer({ resourceId, trackId, onCompleted }: QuizPlayerProps) {
  const [quiz, setQuiz] = useState<QuizPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<QuizAttemptResult | null>(null)
  const [locked, setLocked] = useState(false)
  const [answers, setAnswers] = useState<Record<string, QuizAnswer>>({})

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError("")
        const res = await fetch(`/api/lms/quizzes/${resourceId}`, { credentials: "include" })
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          throw new Error(payload.error || "Erro ao carregar quiz")
        }
        const data: QuizPayload = await res.json()
        setQuiz(data)
        if (data.hasAttempt) {
          if (data.attempt) setResult(data.attempt)
          setLocked(true)
        }
      } catch (err) {
        console.error(err)
        setError("Erro ao carregar quiz. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [resourceId])

  const allAnswered = useMemo(() => {
    if (!quiz) return false
    return quiz.questions.every((q) => {
      const answer = answers[q.id]
      if (!answer) return false
      if (q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") {
        return Boolean(answer.textAnswer?.trim())
      }
      return (answer.optionIds?.length ?? 0) > 0
    })
  }, [answers, quiz])

  const setTextAnswer = (question: QuizQuestion, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { questionId: question.id, type: question.type, textAnswer: value },
    }))
  }

  const toggleOption = (question: QuizQuestion, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[question.id]
      if (question.type === "SINGLE_CHOICE") {
        return {
          ...prev,
          [question.id]: { questionId: question.id, type: question.type, optionIds: [optionId] },
        }
      }
      const existing = new Set(current?.optionIds ?? [])
      if (existing.has(optionId)) {
        existing.delete(optionId)
      } else {
        existing.add(optionId)
      }
      return {
        ...prev,
        [question.id]: { questionId: question.id, type: question.type, optionIds: Array.from(existing) },
      }
    })
  }

  const handleSubmit = async () => {
    if (!quiz || locked) return
    setError("")
    if (!allAnswered) {
      setError("Responda todas as perguntas antes de enviar.")
      return
    }
    const confirmed = window.confirm(
      "Você não poderá alterar ou reenviar o quiz depois de enviar. Deseja continuar?",
    )
    if (!confirmed) return

    try {
      setSubmitting(true)
      const orderedAnswers: QuizAnswer[] = quiz.questions.map((q) => {
        const answer = answers[q.id]
        return {
          questionId: q.id,
          type: q.type,
          textAnswer: answer?.textAnswer,
          optionIds: answer?.optionIds,
        }
      })
      const res = await fetch(`/api/lms/quizzes/${resourceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quizId: quiz.quizId, answers: orderedAnswers }),
      })
      if (res.status === 409) {
        const payload = await res.json().catch(() => ({}))
        setError(payload.error || "Você já respondeu este quiz.")
        setLocked(true)
        return
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Erro ao enviar quiz")
      }
      const payload = await res.json()
      const attempt = {
        percent: payload.percent,
        score: payload.score,
        totalQuestions: payload.totalQuestions,
        correctAnswers: payload.correctAnswers,
      } as QuizAttemptResult
      setResult(attempt)
      setLocked(true)
      await onCompleted?.()
    } catch (err) {
      console.error(err)
      setError("Erro ao enviar quiz. Tente novamente.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Carregando quiz...
      </div>
    )
  }

  if (!quiz) {
    return <div className="text-sm text-muted-foreground">Quiz indisponível.</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{quiz.title}</h3>
        <p className="text-xs text-muted-foreground">Cada pergunta vale 1 ponto.</p>
      </div>

      {result && (
        <Card className="border-border/60 bg-muted/30">
          <CardContent className="p-4 space-y-1">
            <div className="text-sm font-semibold text-foreground">Sua nota: {result.percent}%</div>
            <div className="text-xs text-muted-foreground">
              {result.correctAnswers} de {result.totalQuestions} questões corretas
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {quiz.questions.map((q, index) => {
          const safePrompt = sanitizeHtml(q.prompt || "")
          const answer = answers[q.id]
          return (
            <Card key={q.id} className="border-border/50 bg-background/80">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-foreground">Pergunta {index + 1}</div>
                  <span className="text-xs text-muted-foreground">{questionLabel[q.type]}</span>
                </div>
                <div
                  className="text-sm text-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: safePrompt || "Pergunta sem enunciado." }}
                />

                {(q.type === "SHORT_TEXT" || q.type === "LONG_TEXT") && (
                  <div>
                    {q.type === "SHORT_TEXT" ? (
                      <Input
                        value={answer?.textAnswer ?? ""}
                        onChange={(e) => setTextAnswer(q, e.target.value)}
                        disabled={locked}
                        placeholder="Digite sua resposta"
                      />
                    ) : (
                      <textarea
                        className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5dcff] min-h-[120px]"
                        value={answer?.textAnswer ?? ""}
                        onChange={(e) => setTextAnswer(q, e.target.value)}
                        disabled={locked}
                      />
                    )}
                  </div>
                )}

                {(q.type === "SINGLE_CHOICE" || q.type === "MULTIPLE_CHOICE") && (
                  <div className="space-y-2">
                    {(q.options ?? []).map((opt) => {
                      const selected = answer?.optionIds?.includes(opt.id) ?? false
                      return (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm ${
                            locked ? "opacity-70" : "hover:border-blue-500/40"
                          }`}
                        >
                          <input
                            type={q.type === "SINGLE_CHOICE" ? "radio" : "checkbox"}
                            name={`quiz-${trackId}-${q.id}`}
                            checked={selected}
                            onChange={() => toggleOption(q, opt.id)}
                            disabled={locked}
                          />
                          <span className="text-foreground">{opt.text}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {!locked && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSubmit} disabled={!allAnswered || submitting}>
            {submitting ? "Enviando..." : "Enviar para Avaliação"}
          </Button>
        </div>
      )}
    </div>
  )
}
