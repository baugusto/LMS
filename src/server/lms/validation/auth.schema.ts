import { z } from "zod"

const passwordSchema = z
  .string()
  .min(10)
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, "Senha deve conter maiúsculas, minúsculas, número e símbolo")

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const registerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: passwordSchema,
})
