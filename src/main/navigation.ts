import type { SearchEngine } from '../shared/types'

const SEARCH_URLS: Record<SearchEngine, string> = {
  google: 'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  bing: 'https://www.bing.com/search?q=',
  brave: 'https://search.brave.com/search?q='
}

export const INTERNAL_PAGES = new Set([
  'liqueia://newtab',
  'liqueia://settings',
  'liqueia://history',
  'liqueia://bookmarks',
  'liqueia://downloads',
  'liqueia://extensions',
  'liqueia://passwords'
])

export function resolveNavigationInput(input: string, searchEngine: SearchEngine): string {
  const value = input.trim()
  if (!value) return 'liqueia://newtab'
  if (INTERNAL_PAGES.has(value)) return value

  try {
    return new URL(value).toString()
  } catch {
    const looksLikeHost = value.includes('.') && !value.includes(' ') && !value.startsWith('.')
    if (looksLikeHost) {
      try {
        return new URL(`https://${value}`).toString()
      } catch {
        // Invalid host-like input is handled as a search below.
      }
    }
    return `${SEARCH_URLS[searchEngine]}${encodeURIComponent(value)}`
  }
}
