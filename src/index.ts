/**
 * Core types and utilities for URL parameter management
 */

/**
 * Encodes a value to a URL query parameter string.
 * - undefined: parameter not present in URL
 * - "": valueless parameter (e.g., ?z)
 * - string: parameter with value (e.g., ?z=foo)
 */
export type Encoded = string | undefined

/**
 * A bidirectional converter between a typed value and its URL representation.
 */
export type Param<T> = {
  encode: (value: T) => Encoded
  decode: (encoded: Encoded) => T
}

/**
 * Serialize query parameters to URL string.
 * Handles valueless params (empty string → ?key without =)
 */
export function serializeParams(params: Record<string, Encoded>): string {
  const parts: string[] = []

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      // Skip undefined values
      continue
    } else if (value === '') {
      // Valueless param: ?key
      parts.push(encodeURIComponent(key))
    } else {
      // Param with value: ?key=value
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    }
  }

  return parts.join('&')
}

/**
 * Parse query parameters from URL string or URLSearchParams.
 * Note: URLSearchParams treats ?z and ?z= identically (both as empty string).
 */
export function parseParams(source: string | URLSearchParams): Record<string, Encoded> {
  const searchParams = typeof source === 'string'
    ? new URLSearchParams(source)
    : source

  const result: Record<string, Encoded> = {}

  for (const [key, value] of searchParams.entries()) {
    result[key] = value
  }

  return result
}

/**
 * Get current URL query parameters (browser only)
 */
export function getCurrentParams(): Record<string, Encoded> {
  if (typeof window === 'undefined') return {}
  return parseParams(window.location.search)
}

/**
 * Update URL without reloading (browser only)
 * @param params - New query parameters
 * @param push - Use pushState (true) or replaceState (false)
 */
export function updateUrl(params: Record<string, Encoded>, push = false): void {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  const search = serializeParams(params)
  url.search = search

  const method = push ? 'pushState' : 'replaceState'
  window.history[method]({}, '', url.toString())
}

export * from './params.js'
export * from './useUrlParam.js'
