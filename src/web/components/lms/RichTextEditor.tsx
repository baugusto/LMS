"use client"

import React, { useEffect } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import Link from "@tiptap/extension-link"
import Image from "@tiptap/extension-image"
import Youtube from "@tiptap/extension-youtube"
import TextAlign from "@tiptap/extension-text-align"
import { Button } from "@/web/components/ui/button"
import { Toggle } from "@/web/components/ui/toggle"
import { Separator } from "@/web/components/ui/separator"
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  ImageIcon,
  Youtube as YoutubeIcon,
  Eraser,
  Heading1,
  Heading2,
  Text as TextIcon,
} from "lucide-react"
import { cn } from "@/web/lib/utils"

export type RichTextEditorProps = {
  value: string
  onChange: (val: string) => void
  label?: string
  placeholder?: string
  error?: string
  className?: string
}

function getYoutubeEmbed(url: string) {
  const short = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  const normal = url.match(/v=([A-Za-z0-9_-]{11})/)
  const id = short?.[1] ?? normal?.[1]
  if (!id) return null
  return `https://www.youtube.com/embed/${id}`
}

export function RichTextEditor({ value, onChange, label, placeholder, error, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        validate: (href) => /^https?:\/\//.test(href),
      }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full rounded-md" },
      }),
      Youtube.configure({
        HTMLAttributes: { class: "w-full aspect-video rounded-md" },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none min-h-[180px] max-h-[420px] overflow-y-auto rounded-xl border border-border/50 bg-muted/30 px-4 py-3 focus:outline-none focus:border-blue-500/50 transition-colors text-foreground",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false)
    }
  }, [value, editor])

  if (!editor) return null

  const promptUrl = (msg: string) => {
    const url = window.prompt(msg)
    return url && url.trim().length > 0 ? url.trim() : null
  }

  const toolbarButtonClass =
    "h-9 w-9 p-0 rounded-lg border border-border/40 bg-muted/30 text-foreground/70 hover:bg-muted/60 hover:text-foreground hover:border-blue-500/30 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-400 data-[state=on]:border-blue-500/40"

  const toolbarButton = (opts: { onClick: () => void; active?: boolean; icon: React.ReactNode; title?: string }) => (
    <Toggle
      pressed={opts.active}
      onPressedChange={opts.onClick}
      className={toolbarButtonClass}
      title={opts.title}
      aria-label={opts.title}
    >
      {opts.icon}
    </Toggle>
  )

  return (
    <div className={cn("space-y-2", className)}>
      {label && <div className="text-sm font-medium text-foreground">{label}</div>}
      <div className="rounded-xl border border-border/50 bg-muted/20 shadow-card">
        <div className="flex flex-wrap items-center gap-1 px-3 py-2 border-b border-border/30">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            aria-label="Desfazer"
            className={toolbarButtonClass}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            aria-label="Refazer"
            className={toolbarButtonClass}
          >
            <Redo2 className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <div className="flex items-center gap-1">
            {toolbarButton({
              onClick: () => editor.chain().focus().setParagraph().run(),
              active: editor.isActive("paragraph"),
              icon: <TextIcon className="w-4 h-4" />,
              title: "Parágrafo",
            })}
            {toolbarButton({
              onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
              active: editor.isActive("heading", { level: 1 }),
              icon: <Heading1 className="w-4 h-4" />,
              title: "Título 1",
            })}
            {toolbarButton({
              onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
              active: editor.isActive("heading", { level: 2 }),
              icon: <Heading2 className="w-4 h-4" />,
              title: "Título 2",
            })}
          </div>

          <Separator orientation="vertical" className="mx-1 h-6" />

          {toolbarButton({
            onClick: () => editor.chain().focus().toggleBold().run(),
            active: editor.isActive("bold"),
            icon: <Bold className="w-4 h-4" />,
            title: "Negrito",
          })}
          {toolbarButton({
            onClick: () => editor.chain().focus().toggleItalic().run(),
            active: editor.isActive("italic"),
            icon: <Italic className="w-4 h-4" />,
            title: "Itálico",
          })}
          {toolbarButton({
            onClick: () => editor.chain().focus().toggleUnderline().run(),
            active: editor.isActive("underline"),
            icon: <UnderlineIcon className="w-4 h-4" />,
            title: "Sublinhado",
          })}

          <Separator orientation="vertical" className="mx-1 h-6" />

          {toolbarButton({
            onClick: () => editor.chain().focus().setTextAlign("left").run(),
            active: editor.isActive({ textAlign: "left" }),
            icon: <AlignLeft className="w-4 h-4" />,
            title: "Alinhar à esquerda",
          })}
          {toolbarButton({
            onClick: () => editor.chain().focus().setTextAlign("center").run(),
            active: editor.isActive({ textAlign: "center" }),
            icon: <AlignCenter className="w-4 h-4" />,
            title: "Centralizar",
          })}
          {toolbarButton({
            onClick: () => editor.chain().focus().setTextAlign("right").run(),
            active: editor.isActive({ textAlign: "right" }),
            icon: <AlignRight className="w-4 h-4" />,
            title: "Alinhar à direita",
          })}
          {toolbarButton({
            onClick: () => editor.chain().focus().setTextAlign("justify").run(),
            active: editor.isActive({ textAlign: "justify" }),
            icon: <AlignJustify className="w-4 h-4" />,
            title: "Justificar",
          })}

          <Separator orientation="vertical" className="mx-1 h-6" />

          {toolbarButton({
            onClick: () => editor.chain().focus().toggleBulletList().run(),
            active: editor.isActive("bulletList"),
            icon: <List className="w-4 h-4" />,
            title: "Lista não ordenada",
          })}
          {toolbarButton({
            onClick: () => editor.chain().focus().toggleOrderedList().run(),
            active: editor.isActive("orderedList"),
            icon: <ListOrdered className="w-4 h-4" />,
            title: "Lista ordenada",
          })}

          <Separator orientation="vertical" className="mx-1 h-6" />

          {toolbarButton({
            onClick: () => {
              const url = promptUrl("Informe a URL da imagem")
              if (url) editor.chain().focus().setImage({ src: url }).run()
            },
            icon: <ImageIcon className="w-4 h-4" />,
            title: "Inserir imagem",
          })}

          {toolbarButton({
            onClick: () => {
              const url = promptUrl("URL do vídeo (YouTube)")
              const embed = url ? getYoutubeEmbed(url) : null
              if (embed) {
                editor.chain().focus().setYoutubeVideo({ src: embed }).run()
              }
            },
            icon: <YoutubeIcon className="w-4 h-4" />,
            title: "Inserir vídeo",
          })}

          {toolbarButton({
            onClick: () => {
              const url = promptUrl("URL do link (https://...)")
              if (url) {
                editor.chain().focus().extendMarkRange("link").setLink({ href: url, target: "_blank" }).run()
              }
            },
            active: editor.isActive("link"),
            icon: <LinkIcon className="w-4 h-4" />,
            title: "Inserir link",
          })}

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
            title="Limpar formatação"
            className={toolbarButtonClass}
          >
            <Eraser className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-3 pb-3 pt-2">
          <EditorContent editor={editor} placeholder={placeholder} />
        </div>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
