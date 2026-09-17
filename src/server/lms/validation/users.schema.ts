import { z } from "zod"

const passwordSchema = z
  .string()
  .min(10)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, "Senha deve conter maiúsculas, minúsculas, número e símbolo")

const optionalString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((v) => (v && v.length > 0 ? v : undefined))

export const userCreateSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: passwordSchema,
  whatsapp: optionalString,
  role: z.enum(["ADMIN", "PARTNER"]),
  companyId: optionalString,
  partnerProfileIds: z.array(z.string()).optional(),
})

export const userUpdateSchema = userCreateSchema.partial().extend({
  password: passwordSchema.optional().nullable(),
})

const idsSchema = z.array(z.string().min(1)).min(1)

export const userBulkDeleteSchema = z.object({
  ids: idsSchema,
})

export const userBulkUpdateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("company"),
    ids: idsSchema,
    companyId: optionalString,
  }),
  z.object({
    action: z.literal("partner-profiles"),
    ids: idsSchema,
    partnerProfileIds: z.array(z.string().min(1)).min(1),
  }),
])
