import { describe, expect, it } from "vitest"
import {
  withResetCallback,
  withVerificationCallback,
} from "../auth/callback-url.js"

const config = {
  webAppUrl: "http://localhost:5173",
  mobileAppUrl: "mytuums://",
  mobileVerifyEmailCallbackUrl: "mytuums://auth/verify-email",
  mobileResetPasswordCallbackUrl: "mytuums://auth/reset-password",
}

describe("auth callback urls", () => {
  it("generates a mobile verification deep link when the mobile app initiated sign-up", () => {
    const url = new URL("http://localhost:4000/api/auth/verify-email")
    url.searchParams.set("token", "verify-token")
    url.searchParams.set("callbackURL", "mytuums://auth/verify-email")

    const emailUrl = new URL(withVerificationCallback(url.toString(), config))

    expect(emailUrl.protocol).toBe("mytuums:")
    expect(emailUrl.host).toBe("auth")
    expect(emailUrl.pathname).toBe("/verify-email")
    expect(emailUrl.searchParams.get("token")).toBe("verify-token")
  })

  it("falls back to the web app for legacy verification links", () => {
    const url = new URL("http://localhost:4000/api/auth/verify-email")
    url.searchParams.set("token", "verify-token")

    const callbackUrl = new URL(
      withVerificationCallback(url.toString(), config)
    ).searchParams.get("callbackURL")

    expect(callbackUrl).toBe("http://localhost:5173")
  })

  it("generates a mobile reset deep link when the mobile app requested reset", () => {
    const url = new URL("http://localhost:4000/api/auth/reset-password/token")
    url.searchParams.set("callbackURL", "mytuums://auth/reset-password")

    const emailUrl = new URL(withResetCallback(url.toString(), config))

    expect(emailUrl.protocol).toBe("mytuums:")
    expect(emailUrl.host).toBe("auth")
    expect(emailUrl.pathname).toBe("/reset-password")
    expect(emailUrl.searchParams.get("token")).toBe("token")
  })

  it("falls back to the web reset page when no mobile reset callback is present", () => {
    const url = new URL("http://localhost:4000/api/auth/reset-password/token")

    const callbackUrl = new URL(
      withResetCallback(url.toString(), config)
    ).searchParams.get("callbackURL")

    expect(callbackUrl).toBe("http://localhost:5173/reset-password")
  })
})
