import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const routeSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../routes/verify-email.tsx"),
  "utf8"
)

describe("verify email route design", () => {
  it("uses shared v1 surface primitives", () => {
    expect(routeSource).toContain("@workspace/ui/components/card")
    expect(routeSource).toContain("@workspace/ui/components/alert")
    expect(routeSource).toContain("@workspace/ui/components/button")
  })

  it("does not use off-theme confirmation colors", () => {
    expect(routeSource).not.toMatch(/amber|purple|violet|indigo/)
  })
})
