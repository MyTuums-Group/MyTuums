import { describe, expect, it } from "vitest"
import {
  getInitialSearchTypeaheadHighlight,
  getSearchTypeaheadActiveDescendantId,
  getSearchTypeaheadStatus,
  moveSearchTypeaheadHighlight,
} from "../lib/search-typeahead"

describe("search typeahead interaction helpers", () => {
  it("classifies shared typeahead status in UI priority order", () => {
    expect(
      getSearchTypeaheadStatus({
        isDisabled: true,
        isLoading: false,
        query: "ha",
        resultCount: 0,
      })
    ).toBe("disabled")
    expect(
      getSearchTypeaheadStatus({
        isLoading: false,
        query: "",
        resultCount: 0,
      })
    ).toBe("empty")
    expect(
      getSearchTypeaheadStatus({
        isLoading: false,
        query: "h",
        resultCount: 0,
      })
    ).toBe("too_short")
    expect(
      getSearchTypeaheadStatus({
        errorMessage: "Search failed",
        isLoading: false,
        query: "ha",
        resultCount: 1,
      })
    ).toBe("error")
    expect(
      getSearchTypeaheadStatus({
        isLoading: true,
        query: "ha",
        resultCount: 1,
      })
    ).toBe("results")
    expect(
      getSearchTypeaheadStatus({
        isLoading: true,
        query: "ha",
        resultCount: 0,
      })
    ).toBe("loading")
    expect(
      getSearchTypeaheadStatus({
        isLoading: false,
        query: "ha",
        resultCount: 0,
      })
    ).toBe("no_results")
  })

  it("wraps highlighted option navigation", () => {
    expect(
      moveSearchTypeaheadHighlight({
        currentIndex: -1,
        direction: "next",
        itemCount: 3,
      })
    ).toBe(0)
    expect(
      moveSearchTypeaheadHighlight({
        currentIndex: 2,
        direction: "next",
        itemCount: 3,
      })
    ).toBe(0)
    expect(
      moveSearchTypeaheadHighlight({
        currentIndex: 0,
        direction: "previous",
        itemCount: 3,
      })
    ).toBe(2)
    expect(
      moveSearchTypeaheadHighlight({
        currentIndex: 1,
        direction: "previous",
        itemCount: 0,
      })
    ).toBe(-1)
  })

  it("builds active descendant ids only for highlighted results", () => {
    expect(
      getSearchTypeaheadActiveDescendantId({
        highlightedIndex: 1,
        resultIdPrefix: "search-result",
        status: "results",
      })
    ).toBe("search-result-1")
    expect(
      getSearchTypeaheadActiveDescendantId({
        highlightedIndex: -1,
        resultIdPrefix: "search-result",
        status: "results",
      })
    ).toBeUndefined()
    expect(
      getSearchTypeaheadActiveDescendantId({
        highlightedIndex: 1,
        resultIdPrefix: "search-result",
        status: "loading",
      })
    ).toBeUndefined()
  })

  it("can start a result picker with the first item highlighted", () => {
    expect(
      getInitialSearchTypeaheadHighlight({
        initialHighlight: "first_result",
        itemCount: 2,
        status: "results",
      })
    ).toBe(0)
    expect(
      getInitialSearchTypeaheadHighlight({
        initialHighlight: "first_result",
        itemCount: 0,
        status: "no_results",
      })
    ).toBe(-1)
    expect(
      getInitialSearchTypeaheadHighlight({
        initialHighlight: "none",
        itemCount: 2,
        status: "results",
      })
    ).toBe(-1)
  })
})
