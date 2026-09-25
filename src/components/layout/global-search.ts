export const GLOBAL_SEARCH_OPEN_EVENT = 'automai:open-global-search'

type GlobalSearchOpenDetail = {
  returnFocusTo: HTMLElement | null
}

export type GlobalSearchOpenEvent = CustomEvent<GlobalSearchOpenDetail>

export function isGlobalSearchOpenEvent(event: Event): event is GlobalSearchOpenEvent {
  if (event.type !== GLOBAL_SEARCH_OPEN_EVENT || !(event instanceof CustomEvent)) return false
  const detail = event.detail
  if (typeof detail !== 'object' || detail === null || !('returnFocusTo' in detail)) return false
  const returnFocusTo = detail.returnFocusTo
  return returnFocusTo === null || returnFocusTo instanceof HTMLElement
}

export function requestGlobalSearch(returnFocusTo: HTMLElement | null) {
  window.dispatchEvent(new CustomEvent<GlobalSearchOpenDetail>(GLOBAL_SEARCH_OPEN_EVENT, {
    detail: { returnFocusTo },
  }))
}
