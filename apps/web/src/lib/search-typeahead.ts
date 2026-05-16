import { SEARCH_MIN_QUERY_LENGTH } from "@workspace/types"
import {
  useCallback,
  useEffect,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react"

export type SearchTypeaheadStatus =
  | "disabled"
  | "empty"
  | "too_short"
  | "loading"
  | "error"
  | "no_results"
  | "results"

export type SearchTypeaheadInitialHighlight = "none" | "first_result"
export type SearchTypeaheadEnterSelection =
  | "highlighted"
  | "highlighted_or_first"

export type SearchTypeaheadResultProps = {
  id: string
  role: "option"
  "aria-selected": boolean
  onMouseEnter: () => void
}

export function getSearchTypeaheadStatus({
  errorMessage,
  isDisabled = false,
  isLoading,
  minQueryLength = SEARCH_MIN_QUERY_LENGTH,
  query,
  resultCount,
}: {
  errorMessage?: string | null
  isDisabled?: boolean
  isLoading: boolean
  minQueryLength?: number
  query: string
  resultCount: number
}): SearchTypeaheadStatus {
  if (isDisabled) return "disabled"

  const trimmedQuery = query.trim()
  if (trimmedQuery.length === 0) return "empty"
  if (trimmedQuery.length < minQueryLength) return "too_short"
  if (errorMessage) return "error"
  if (resultCount > 0) return "results"
  if (isLoading) return "loading"
  return "no_results"
}

export function getSearchTypeaheadActiveDescendantId({
  highlightedIndex,
  resultIdPrefix,
  status,
}: {
  highlightedIndex: number
  resultIdPrefix: string
  status: SearchTypeaheadStatus
}) {
  if (status !== "results" || highlightedIndex < 0) return undefined
  return `${resultIdPrefix}-${highlightedIndex}`
}

export function moveSearchTypeaheadHighlight({
  currentIndex,
  direction,
  itemCount,
}: {
  currentIndex: number
  direction: "next" | "previous"
  itemCount: number
}) {
  if (itemCount <= 0) return -1

  if (direction === "next") {
    return currentIndex < itemCount - 1 ? currentIndex + 1 : 0
  }

  return currentIndex > 0 ? currentIndex - 1 : itemCount - 1
}

export function getInitialSearchTypeaheadHighlight({
  initialHighlight,
  itemCount,
  status,
}: {
  initialHighlight: SearchTypeaheadInitialHighlight
  itemCount: number
  status: SearchTypeaheadStatus
}) {
  if (initialHighlight !== "first_result") return -1
  return status === "results" && itemCount > 0 ? 0 : -1
}

export function useSearchTypeaheadInteraction<T>({
  blurOnClosedEscape = false,
  enterSelection = "highlighted",
  getItem,
  initialHighlight = "none",
  itemCount,
  listboxId,
  onSelect,
  openOnArrowWithoutResults = false,
  preventEnterWithoutSelection = false,
  resetKey,
  resultIdPrefix,
  status,
}: {
  blurOnClosedEscape?: boolean
  enterSelection?: SearchTypeaheadEnterSelection
  getItem: (index: number) => T | undefined
  initialHighlight?: SearchTypeaheadInitialHighlight
  itemCount: number
  listboxId: string
  onSelect: (item: T) => void
  openOnArrowWithoutResults?: boolean
  preventEnterWithoutSelection?: boolean
  resetKey: string
  resultIdPrefix: string
  status: SearchTypeaheadStatus
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(() =>
    getInitialSearchTypeaheadHighlight({
      initialHighlight,
      itemCount,
      status,
    })
  )

  const close = useCallback(() => {
    setIsOpen(false)
    setHighlightedIndex(-1)
  }, [])

  const open = useCallback(() => {
    if (status !== "disabled") setIsOpen(true)
  }, [status])

  useEffect(() => {
    setHighlightedIndex(
      getInitialSearchTypeaheadHighlight({
        initialHighlight,
        itemCount,
        status,
      })
    )
  }, [initialHighlight, itemCount, resetKey, status])

  useEffect(() => {
    if (status === "disabled") close()
  }, [close, status])

  const activeDescendantId = getSearchTypeaheadActiveDescendantId({
    highlightedIndex,
    resultIdPrefix,
    status,
  })

  const selectItem = useCallback(
    (item: T) => {
      onSelect(item)
      close()
    },
    [close, onSelect]
  )

  const selectAtIndex = useCallback(
    (index: number) => {
      const item = status === "results" ? getItem(index) : undefined
      if (!item) return false

      selectItem(item)
      return true
    },
    [getItem, selectItem, status]
  )

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (status === "disabled") return

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        if (itemCount === 0 && !openOnArrowWithoutResults) return

        event.preventDefault()
        open()
        setHighlightedIndex((current) =>
          moveSearchTypeaheadHighlight({
            currentIndex: current,
            direction: event.key === "ArrowDown" ? "next" : "previous",
            itemCount,
          })
        )
        return
      }

      if (event.key === "Enter") {
        const selectionIndex =
          highlightedIndex >= 0
            ? highlightedIndex
            : enterSelection === "highlighted_or_first"
              ? 0
              : -1
        const didSelect =
          selectionIndex >= 0 ? selectAtIndex(selectionIndex) : false

        if (didSelect || preventEnterWithoutSelection) {
          event.preventDefault()
        }
        return
      }

      if (event.key === "Escape") {
        if (isOpen) {
          event.preventDefault()
          close()
          return
        }

        if (blurOnClosedEscape) {
          event.currentTarget.blur()
        }
      }
    },
    [
      blurOnClosedEscape,
      close,
      enterSelection,
      highlightedIndex,
      isOpen,
      itemCount,
      open,
      openOnArrowWithoutResults,
      preventEnterWithoutSelection,
      selectAtIndex,
      status,
    ]
  )

  const handleBlurWithin = useCallback(
    (event: FocusEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget
      if (
        nextTarget instanceof Node &&
        event.currentTarget.contains(nextTarget)
      ) {
        return
      }

      close()
    },
    [close]
  )

  const getInputA11yProps = useCallback(
    (isExpanded: boolean) => ({
      "aria-expanded": isExpanded,
      "aria-controls": listboxId,
      "aria-activedescendant": activeDescendantId,
    }),
    [activeDescendantId, listboxId]
  )

  const getResultProps = useCallback(
    (index: number): SearchTypeaheadResultProps => ({
      id: `${resultIdPrefix}-${index}`,
      role: "option",
      "aria-selected": highlightedIndex === index,
      onMouseEnter: () => setHighlightedIndex(index),
    }),
    [highlightedIndex, resultIdPrefix]
  )

  return {
    getInputA11yProps,
    getResultProps,
    handleBlurWithin,
    handleInputKeyDown,
    highlightedIndex,
    isOpen,
    open,
    selectItem,
  }
}
