/**
 * Core multi-value operations and location strategies
 */

/**
 * Multi-value encoded representation
 * An array of strings representing multiple values for a single URL parameter key
 */
export type MultiEncoded = string[]

/**
 * Location strategy interface for abstracting URL storage location
 * (query string vs hash fragment)
 */
export interface LocationStrategy {
  /** Get raw string from location (for caching comparison) */
  getRaw(): string
  /** Parse current location to multi-value params */
  parse(): Record<string, MultiEncoded>
  /** Build URL string with updated params */
  buildUrl(base: URL, params: Record<string, MultiEncoded>): string
  /** Subscribe to location changes, returns unsubscribe function */
  subscribe(callback: () => void): () => void
}

/**
 * Parse URL string to multi-value params
 * Each key maps to an array of all values for that key
 */
export function parseMultiParams(source: string | URLSearchParams): Record<string, MultiEncoded> {
  const searchParams = typeof source === 'string'
    ? new URLSearchParams(source)
    : source

  const result: Record<string, MultiEncoded> = {}
  const keys = new Set(searchParams.keys())

  for (const key of keys) {
    result[key] = searchParams.getAll(key)
  }

  return result
}

/**
 * Serialize multi-value params to URL string format
 * Repeated keys are serialized as separate entries: key=a&key=b
 */
export function serializeMultiParams(params: Record<string, MultiEncoded>): string {
  const searchParams = new URLSearchParams()

  for (const [key, values] of Object.entries(params)) {
    for (const value of values) {
      if (value === '') {
        // Valueless params handled separately
        continue
      }
      searchParams.append(key, value)
    }
  }

  let result = searchParams.toString()

  // Handle valueless params (empty string values) manually
  const valuelessKeys = Object.entries(params)
    .filter(([_, values]) => values.includes(''))
    .map(([key, _]) => encodeURIComponent(key))

  if (valuelessKeys.length > 0) {
    const valuelessPart = valuelessKeys.join('&')
    result = result ? `${result}&${valuelessPart}` : valuelessPart
  }

  return result
}

/**
 * Query string location strategy
 * Reads/writes to window.location.search
 */
export const queryStrategy: LocationStrategy = {
  getRaw(): string {
    if (typeof window === 'undefined') return ''
    return window.location.search
  },

  parse(): Record<string, MultiEncoded> {
    if (typeof window === 'undefined') return {}
    return parseMultiParams(window.location.search)
  },

  buildUrl(base: URL, params: Record<string, MultiEncoded>): string {
    base.search = serializeMultiParams(params)
    return base.toString()
  },

  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {}
    window.addEventListener('popstate', callback)
    return () => window.removeEventListener('popstate', callback)
  },
}

/**
 * Hash fragment location strategy
 * Reads/writes to window.location.hash
 * Hash is parsed as URLSearchParams format: #key=value&key2=value2
 */
export const hashStrategy: LocationStrategy = {
  getRaw(): string {
    if (typeof window === 'undefined') return ''
    return window.location.hash
  },

  parse(): Record<string, MultiEncoded> {
    if (typeof window === 'undefined') return {}
    const hash = window.location.hash
    // Remove leading # if present
    const hashString = hash.startsWith('#') ? hash.slice(1) : hash
    return parseMultiParams(hashString)
  },

  buildUrl(base: URL, params: Record<string, MultiEncoded>): string {
    base.hash = serializeMultiParams(params)
    return base.toString()
  },

  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {}
    // Listen to both hashchange and popstate for hash navigation
    window.addEventListener('hashchange', callback)
    window.addEventListener('popstate', callback)
    return () => {
      window.removeEventListener('hashchange', callback)
      window.removeEventListener('popstate', callback)
    }
  },
}

// Default strategy (can be changed by entry points like hash.ts)
let defaultStrategy: LocationStrategy = queryStrategy

/**
 * Get the current default location strategy
 */
export function getDefaultStrategy(): LocationStrategy {
  return defaultStrategy
}

/**
 * Set the default location strategy
 * Called by entry points (e.g., hash.ts sets this to hashStrategy)
 */
export function setDefaultStrategy(strategy: LocationStrategy): void {
  defaultStrategy = strategy
}
