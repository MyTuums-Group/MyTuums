import { describe, expect, it } from "vitest"
import {
  COMMENT_TEXT_MAX_LENGTH,
  GAME_SLUG_MAX_LENGTH,
  POST_TEXT_MAX_LENGTH,
  USERNAME_MAX_LENGTH,
  createCommentBody,
  createGameSlug,
  createPostBody,
  createUsername,
} from "./index.js"

describe("shared value objects", () => {
  it("normalizes and brands valid usernames", () => {
    expect(createUsername(" Alice_123 ")).toEqual({
      ok: true,
      value: "alice_123",
    })
  })

  it("rejects invalid usernames with v1 rules", () => {
    expect(createUsername("ab")).toMatchObject({
      ok: false,
      error: { field: "username" },
    })
    expect(createUsername("1alice")).toMatchObject({
      ok: false,
      error: { field: "username" },
    })
    expect(createUsername("alice-player")).toMatchObject({
      ok: false,
      error: { field: "username" },
    })
    expect(createUsername("a".repeat(USERNAME_MAX_LENGTH + 1))).toMatchObject({
      ok: false,
      error: { field: "username" },
    })
    expect(createUsername("admin")).toMatchObject({
      ok: false,
      error: { field: "username" },
    })
  })

  it("normalizes and validates post bodies", () => {
    expect(
      createPostBody(`\r\n ${"a".repeat(POST_TEXT_MAX_LENGTH)} \r`)
    ).toEqual({
      ok: true,
      value: "a".repeat(POST_TEXT_MAX_LENGTH),
    })
    expect(createPostBody(" \n\t ")).toMatchObject({
      ok: false,
      error: { field: "body" },
    })
    expect(createPostBody("a".repeat(POST_TEXT_MAX_LENGTH + 1))).toMatchObject({
      ok: false,
      error: { field: "body" },
    })
  })

  it("normalizes and validates comment bodies", () => {
    expect(
      createCommentBody(` ${"a".repeat(COMMENT_TEXT_MAX_LENGTH)} `)
    ).toEqual({
      ok: true,
      value: "a".repeat(COMMENT_TEXT_MAX_LENGTH),
    })
    expect(createCommentBody("")).toMatchObject({
      ok: false,
      error: { field: "body" },
    })
    expect(
      createCommentBody("a".repeat(COMMENT_TEXT_MAX_LENGTH + 1))
    ).toMatchObject({
      ok: false,
      error: { field: "body" },
    })
  })

  it("normalizes and validates game slugs", () => {
    expect(createGameSlug(" Valorant ")).toEqual({
      ok: true,
      value: "valorant",
    })
    expect(createGameSlug("elden--ring")).toMatchObject({
      ok: false,
      error: { field: "slug" },
    })
    expect(createGameSlug("")).toMatchObject({
      ok: false,
      error: { field: "slug" },
    })
    expect(createGameSlug("a".repeat(GAME_SLUG_MAX_LENGTH + 1))).toMatchObject({
      ok: false,
      error: { field: "slug" },
    })
  })
})
