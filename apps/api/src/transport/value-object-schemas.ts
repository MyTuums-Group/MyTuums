import { createGameSlug, type GameSlug } from "@workspace/types"
import { z } from "zod"

export const gameSlugSchema = z.string().transform((value, ctx): GameSlug => {
  const result = createGameSlug(value)
  if (!result.ok) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: result.error.message,
    })
    return z.NEVER
  }

  return result.value
})

export const optionalGameSlugFilterSchema = z.preprocess(
  (value: unknown) => {
    if (value === undefined || value === null) return undefined
    if (typeof value !== "string") return value

    const trimmed = value.trim()
    return trimmed.length === 0 ? undefined : trimmed
  },
  z.union([gameSlugSchema, z.undefined()])
)
