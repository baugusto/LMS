import { z } from "zod"

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
  }
  return value
}

export const companySchema = z.object({
  name: z.string().min(2),
  cnpj: z.preprocess(emptyToUndefined, z.string().optional()),
  website: z.preprocess(emptyToUndefined, z.string().url().optional()),
  logoUrl: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((value) => value.startsWith("data:image/") || value.startsWith("http"), {
        message: "Logo inválida",
      })
      .optional(),
  ),
})
