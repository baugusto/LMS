import DOMPurify from "dompurify"

const ALLOWED_TAGS = [
  "a",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "p",
  "br",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "code",
  "pre",
  "img",
  "span",
  "div",
]

const ALLOWED_ATTR = ["href", "target", "rel", "src", "alt", "title", "width", "height", "frameborder", "allow", "allowfullscreen"]

export function sanitizeHtml(html: string) {
  if (typeof window === "undefined") return html
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ["allowfullscreen"],
    ALLOW_DATA_ATTR: false,
  })
}
