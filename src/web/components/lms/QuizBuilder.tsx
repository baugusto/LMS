"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/web/components/ui/button"
import { Input } from "@/web/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/web/components/ui/card"
import { cn } from "@/web/lib/utils"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

export type QuizQuestionType = "SHORT_TEXT" | "LONG_TEXT" | "MULTIPLE_CHOICE" | "SINGLE_CHOICE"

export type QuizOption = {
  id?: string
  text: string
  isCorrect: boolean
  order?: number
}

export type QuizQuestion = {
  id?: string
  prompt: string
  type: QuizQuestionType
  correctTextAnswer?: string | null
  options?: QuizOption[]
  order?: number
}

export type QuizDefinition = {
  title: string
  questions: QuizQuestion[]
}

export type QuizBuilderProps = {
  value?: QuizDefinition | null
  onChange: (quiz: QuizDefinition) => void
  maxQuestions?: number
}

const QUESTION_TYPE_LABEL: Record<QuizQuestionType, string> = {
  SHORT_TEXT: "Resposta curta",
  LONG_TEXT: "Resposta longa",
  MULTIPLE_CHOICE: "Múltipla escolha",
  SINGLE_CHOICE: "Escolha única",
}

const DEFAULT_OPTION_COUNT = 2
const MAX_OPTIONS = 8

const createEmptyQuestion = (): QuizQuestion => ({
  id: crypto.randomUUID(),
  prompt: "",
  type: "SHORT_TEXT",
  correctTextAnswer: "",
  options: [],
})

export function QuizBuilder({ value, onChange, maxQuestions = 20 }: QuizBuilderProps) {
  const [quiz, setQuiz] = useState<QuizDefinition>(value ?? { title: "", questions: [] })

  useEffect(() => {
    if (value) {
      setQuiz(value)
    }
  }, [value])

  const canAddQuestion = quiz.questions.length < maxQuestions

  const sync = (next: QuizDefinition) => {
    setQuiz(next)
    onChange(next)
  }

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    const nextQuestions = quiz.questions.map((q, idx) => (idx === index ? { ...q, ...patch } : q))
    sync({ ...quiz, questions: nextQuestions })
  }

  const addQuestion = () => {
    if (!canAddQuestion) return
    sync({ ...quiz, questions: [...quiz.questions, createEmptyQuestion()] })
  }

  const removeQuestion = (index: number) => {
    const next = quiz.questions.filter((_, idx) => idx !== index)
    sync({ ...quiz, questions: next })
  }

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= quiz.questions.length) return
    const next = [...quiz.questions]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    sync({ ...quiz, questions: next })
  }

  const setQuestionType = (index: number, type: QuizQuestionType) => {
    if (type === "MULTIPLE_CHOICE" || type === "SINGLE_CHOICE") {
      const baseOptions = Array.from({ length: DEFAULT_OPTION_COUNT }).map(() => ({
        id: crypto.randomUUID(),
        text: "",
        isCorrect: false,
      }))
      updateQuestion(index, { type, options: baseOptions, correctTextAnswer: "" })
      return
    }
    updateQuestion(index, { type, correctTextAnswer: "", options: [] })
  }

  const updateOption = (qIndex: number, oIndex: number, patch: Partial<QuizOption>) => {
    const question = quiz.questions[qIndex]
    const options = question.options ?? []
    const nextOptions = options.map((opt, idx) => (idx === oIndex ? { ...opt, ...patch } : opt))
    updateQuestion(qIndex, { options: nextOptions })
  }

  const toggleCorrect = (qIndex: number, oIndex: number) => {
    const question = quiz.questions[qIndex]
    const options = question.options ?? []
    if (question.type === "SINGLE_CHOICE") {
      const nextOptions = options.map((opt, idx) => ({ ...opt, isCorrect: idx === oIndex }))
      updateQuestion(qIndex, { options: nextOptions })
      return
    }
    const nextOptions = options.map((opt, idx) => (idx === oIndex ? { ...opt, isCorrect: !opt.isCorrect } : opt))
    updateQuestion(qIndex, { options: nextOptions })
  }

  const addOption = (qIndex: number) => {
    const question = quiz.questions[qIndex]
    const options = question.options ?? []
    if (options.length >= MAX_OPTIONS) return
    const nextOptions = [...options, { id: crypto.randomUUID(), text: "", isCorrect: false }]
    updateQuestion(qIndex, { options: nextOptions })
  }

  const removeOption = (qIndex: number, oIndex: number) => {
    const question = quiz.questions[qIndex]
    const options = question.options ?? []
    const nextOptions = options.filter((_, idx) => idx !== oIndex)
    updateQuestion(qIndex, { options: nextOptions })
  }

  const questionList = useMemo(() => quiz.questions, [quiz.questions])

  return (
    <Card className="border-border/50 bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quiz</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Título do quiz</label>
          <Input
            value={quiz.title}
            onChange={(e) => sync({ ...quiz, title: e.target.value })}
            placeholder="Ex.: Conhecimentos gerais"
          />
        </div>

        <div className="space-y-4">
          {questionList.length === 0 && (
            <div className="text-sm text-muted-foreground">Adicione perguntas para montar o quiz.</div>
          )}
          {questionList.map((question, index) => (
            <Card key={question.id ?? index} className="border border-border/50 bg-background/80">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">Pergunta {index + 1}</div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveQuestion(index, -1)}
                      disabled={index === 0}
                      className="h-8 w-8"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => moveQuestion(index, 1)}
                      disabled={index === questionList.length - 1}
                      className="h-8 w-8"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(index)}
                      className="h-8 w-8 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Enunciado da pergunta</label>
                  <textarea
                    className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5dcff] min-h-[90px]"
                    value={question.prompt}
                    onChange={(e) => updateQuestion(index, { prompt: e.target.value })}
                    maxLength={4000}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de pergunta</label>
                  <select
                    className="w-full border border-brand-border rounded-lg px-3 py-2 text-sm"
                    value={question.type}
                    onChange={(e) => setQuestionType(index, e.target.value as QuizQuestionType)}
                  >
                    {Object.entries(QUESTION_TYPE_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {(question.type === "SHORT_TEXT" || question.type === "LONG_TEXT") && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Resposta correta</label>
                    {question.type === "SHORT_TEXT" ? (
                      <Input
                        value={question.correctTextAnswer ?? ""}
                        onChange={(e) => updateQuestion(index, { correctTextAnswer: e.target.value })}
                        placeholder="Resposta correta"
                      />
                    ) : (
                      <textarea
                        className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5dcff] min-h-[90px]"
                        value={question.correctTextAnswer ?? ""}
                        onChange={(e) => updateQuestion(index, { correctTextAnswer: e.target.value })}
                        maxLength={4000}
                      />
                    )}
                  </div>
                )}

                {(question.type === "MULTIPLE_CHOICE" || question.type === "SINGLE_CHOICE") && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Opções</label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addOption(index)}
                        disabled={(question.options?.length ?? 0) >= MAX_OPTIONS}
                        className="gap-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar opção
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(question.options ?? []).map((option, optIndex) => (
                        <div key={option.id ?? optIndex} className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleCorrect(index, optIndex)}
                            className={cn(
                              "h-5 w-5 rounded border border-border/70 flex items-center justify-center text-xs",
                              option.isCorrect ? "bg-blue-500/20 border-blue-500/60 text-blue-400" : "text-muted-foreground",
                            )}
                            title="Marcar como correta"
                          >
                            {option.isCorrect ? "✓" : ""}
                          </button>
                          <Input
                            value={option.text}
                            onChange={(e) => updateOption(index, optIndex, { text: e.target.value })}
                            placeholder={`Opção ${optIndex + 1}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(index, optIndex)}
                            className="h-8 w-8 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      {(question.options ?? []).length === 0 && (
                        <div className="text-xs text-muted-foreground">Adicione ao menos 2 opções.</div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {question.type === "SINGLE_CHOICE"
                        ? "Apenas uma opção pode ser correta."
                        : "Marque todas as opções corretas."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {quiz.questions.length}/{maxQuestions} perguntas
          </p>
          <Button type="button" variant="secondary" onClick={addQuestion} disabled={!canAddQuestion} className="gap-2">
            <Plus className="w-4 h-4" />
            Adicionar pergunta
          </Button>
        </div>
        {!canAddQuestion && (
          <p className="text-xs text-muted-foreground">Limite de {maxQuestions} perguntas por quiz alcançado.</p>
        )}
      </CardContent>
    </Card>
  )
}
