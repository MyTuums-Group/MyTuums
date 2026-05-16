import { describe, expect, it } from "vitest"
import {
  getRegistrationPasswordConfirmationMessage,
  isRegistrationPasswordConfirmationBlocking,
  validateRegistrationPasswordConfirmation,
} from "../routes/-register-password-confirmation"

describe("registration password confirmation", () => {
  it("blocks submission when confirmation is missing or different", () => {
    expect(isRegistrationPasswordConfirmationBlocking("password123", "")).toBe(
      true
    )
    expect(
      isRegistrationPasswordConfirmationBlocking("password123", "password124")
    ).toBe(true)
    expect(
      isRegistrationPasswordConfirmationBlocking("password123", "password123")
    ).toBe(false)
  })

  it("reports the actionable confirmation problem before signup", () => {
    expect(
      getRegistrationPasswordConfirmationMessage("password123", "")
    ).toBe("Confirm your password before creating your account.")
    expect(
      getRegistrationPasswordConfirmationMessage("password123", "password124")
    ).toBe("Passwords do not match.")
    expect(
      getRegistrationPasswordConfirmationMessage("password123", "password123")
    ).toBeNull()
  })

  it("returns only the confirmed password to the signup call", () => {
    expect(
      validateRegistrationPasswordConfirmation("password123", "password123")
    ).toEqual({ ok: true, password: "password123" })
    expect(validateRegistrationPasswordConfirmation("password123", "")).toEqual(
      {
        ok: false,
        message: "Confirm your password before creating your account.",
      }
    )
    expect(
      validateRegistrationPasswordConfirmation("password123", "password124")
    ).toEqual({ ok: false, message: "Passwords do not match." })
  })
})
