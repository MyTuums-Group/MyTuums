import { describe, expect, it } from "vitest"
import {
  normalizeUsernameInput,
  validateUsernameCandidate,
} from "../features/onboarding/username"

describe("onboarding username input", () => {
  it("normalizes unsupported characters into the saved username shape", () => {
    expect(normalizeUsernameInput("  Alice Player! ")).toBe("aliceplayer")
    expect(normalizeUsernameInput("__99_Bob")).toBe("bob")
    expect(normalizeUsernameInput("Cafe_Player")).toBe("cafe_player")
  })

  it("keeps only usernames that can pass frontend format validation", () => {
    expect(validateUsernameCandidate("")).toEqual({
      kind: "invalid",
      message: "Username is required.",
    })
    expect(validateUsernameCandidate("ab")).toEqual({
      kind: "invalid",
      message: "Username must be at least 3 characters.",
    })
    expect(validateUsernameCandidate("alice_player")).toEqual({
      kind: "valid",
    })
  })
})
