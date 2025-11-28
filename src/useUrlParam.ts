/**
 * React hooks for managing URL parameters
 */

import { useCallback, useRef, useSyncExternalStore } from 'react'
import type { Param } from './index.js'
import type { LocationStrategy, MultiEncoded } from './core.js'
import { getDefaultStrategy, serializeMultiParams } from './core.js'
import type { MultiParam } from './multiParams.js'

/**
 * Cached snapshot to prevent infinite loops in useSyncExternalStore
 * Keyed by strategy (so query and hash don't share cache)
 */
const snapshotCache = new WeakMap<LocationStrategy, {
  raw: string
  snapshot: Record<string, MultiEncoded>
}>()

/**
 * Get URL snapshot for a given strategy
 * Returns cached snapshot if URL hasn't changed
 */
function getSnapshot(strategy: LocationStrategy): Record<string, MultiEncoded> {
  const raw = strategy.getRaw()
  const cached = snapshotCache.get(strategy)

  if (cached && cached.raw === raw) {
    return cached.snapshot
  }

  const snapshot = strategy.parse()
  snapshotCache.set(strategy, { raw, snapshot })
  return snapshot
}

/**
 * Server-side snapshot (always empty)
 */
function getServerSnapshot(): Record<string, MultiEncoded> {
  return {}
}

/**
 * Convert single-value Encoded to multi-value MultiEncoded
 */
function singleToMulti(encoded: string | undefined): MultiEncoded {
  if (encoded === undefined) return []
  return [encoded]
}

/**
 * Convert multi-value MultiEncoded to single-value Encoded
 */
function multiToSingle(multi: MultiEncoded): string | undefined {
  if (multi.length === 0) return undefined
  return multi[0]
}

/**
 * React hook for managing a single URL query parameter.
 *
 * @param key - Query parameter key
 * @param param - Param encoder/decoder
 * @param push - Use pushState (true) or replaceState (false) when updating
 * @returns Tuple of [value, setValue]
 *
 * @example
 * ```tsx
 * const [zoom, setZoom] = useUrlParam('z', boolParam)
 * const [device, setDevice] = useUrlParam('d', stringParam('default'))
 * ```
 */
export function useUrlParam<T>(
  key: string,
  param: Param<T>,
  push = false
): [T, (value: T) => void] {
  const strategy = getDefaultStrategy()

  // Use ref to avoid recreating setValue when param changes
  const paramRef = useRef(param)
  paramRef.current = param

  // Subscribe to URL changes
  const urlParams = useSyncExternalStore(
    (cb) => strategy.subscribe(cb),
    () => getSnapshot(strategy),
    getServerSnapshot
  )

  // Memoize decoded value based on encoded string AND param identity
  // Re-decode if either the URL param string changes OR the param object changes
  // (e.g., deviceIdsParam depends on devices array which loads asynchronously)
  const encoded = multiToSingle(urlParams[key] ?? [])
  const cacheRef = useRef<{ encoded: typeof encoded; param: Param<T>; decoded: T } | null>(null)

  if (cacheRef.current === null || cacheRef.current.encoded !== encoded || cacheRef.current.param !== param) {
    cacheRef.current = { encoded, param, decoded: param.decode(encoded) }
  }
  const value = cacheRef.current.decoded

  // Update URL when value changes
  const setValue = useCallback(
    (newValue: T) => {
      if (typeof window === 'undefined') return

      const currentParams = strategy.parse()
      const encoded = paramRef.current.encode(newValue)

      // Update this parameter (single → multi)
      if (encoded === undefined) {
        delete currentParams[key]
      } else {
        currentParams[key] = [encoded]
      }

      // Build and update URL
      const url = new URL(window.location.href)
      const newUrl = strategy.buildUrl(url, currentParams)

      const method = push ? 'pushState' : 'replaceState'
      window.history[method]({}, '', newUrl)

      // Trigger events to notify other hooks
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
    [key, push, strategy]
  )

  return [value, setValue]
}

/**
 * React hook for managing multiple URL query parameters together.
 * Updates are batched into a single history entry.
 *
 * @param params - Object mapping keys to Param types
 * @param push - Use pushState (true) or replaceState (false) when updating
 * @returns Object with decoded values and update function
 *
 * @example
 * ```tsx
 * const { values, setValues } = useUrlParams({
 *   zoom: boolParam,
 *   device: stringParam('default'),
 *   count: intParam(10)
 * })
 *
 * // Update multiple params at once
 * setValues({ zoom: true, count: 20 })
 * ```
 */
export function useUrlParams<P extends Record<string, Param<any>>>(
  params: P,
  push = false
): {
  values: { [K in keyof P]: P[K] extends Param<infer T> ? T : never }
  setValues: (updates: Partial<{ [K in keyof P]: P[K] extends Param<infer T> ? T : never }>) => void
} {
  const strategy = getDefaultStrategy()

  // Subscribe to URL changes
  const urlParams = useSyncExternalStore(
    (cb) => strategy.subscribe(cb),
    () => getSnapshot(strategy),
    getServerSnapshot
  )

  // Decode all values from URL
  const values = Object.fromEntries(
    Object.entries(params).map(([key, param]) => [
      key,
      param.decode(multiToSingle(urlParams[key] ?? []))
    ])
  ) as { [K in keyof P]: P[K] extends Param<infer T> ? T : never }

  // Update multiple parameters at once
  const setValues = useCallback(
    (updates: Partial<{ [K in keyof P]: P[K] extends Param<infer T> ? T : never }>) => {
      if (typeof window === 'undefined') return

      const currentParams = strategy.parse()

      // Apply all updates
      for (const [key, value] of Object.entries(updates)) {
        const param = params[key]
        if (!param) continue

        const encoded = param.encode(value)
        if (encoded === undefined) {
          delete currentParams[key]
        } else {
          currentParams[key] = [encoded]
        }
      }

      // Build and update URL once
      const url = new URL(window.location.href)
      const newUrl = strategy.buildUrl(url, currentParams)

      const method = push ? 'pushState' : 'replaceState'
      window.history[method]({}, '', newUrl)

      // Trigger events to notify other hooks
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
    [params, push, strategy]
  )

  return { values, setValues }
}

/**
 * React hook for managing a single multi-value URL parameter.
 * Supports repeated params like ?tag=a&tag=b&tag=c
 *
 * @param key - Query parameter key
 * @param param - MultiParam encoder/decoder
 * @param push - Use pushState (true) or replaceState (false) when updating
 * @returns Tuple of [value, setValue]
 *
 * @example
 * ```tsx
 * const [tags, setTags] = useMultiUrlParam('tag', multiStringParam())
 * // URL: ?tag=a&tag=b → tags = ['a', 'b']
 * ```
 */
export function useMultiUrlParam<T>(
  key: string,
  param: MultiParam<T>,
  push = false
): [T, (value: T) => void] {
  const strategy = getDefaultStrategy()

  // Use ref to avoid recreating setValue when param changes
  const paramRef = useRef(param)
  paramRef.current = param

  // Subscribe to URL changes
  const urlParams = useSyncExternalStore(
    (cb) => strategy.subscribe(cb),
    () => getSnapshot(strategy),
    getServerSnapshot
  )

  // Decode current value from URL
  const value = param.decode(urlParams[key] ?? [])

  // Update URL when value changes
  const setValue = useCallback(
    (newValue: T) => {
      if (typeof window === 'undefined') return

      const currentParams = strategy.parse()
      const encoded = paramRef.current.encode(newValue)

      // Update this parameter
      if (encoded.length === 0) {
        delete currentParams[key]
      } else {
        currentParams[key] = encoded
      }

      // Build and update URL
      const url = new URL(window.location.href)
      const newUrl = strategy.buildUrl(url, currentParams)

      const method = push ? 'pushState' : 'replaceState'
      window.history[method]({}, '', newUrl)

      // Trigger events to notify other hooks
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
    [key, push, strategy]
  )

  return [value, setValue]
}

/**
 * React hook for managing multiple multi-value URL parameters together.
 * Updates are batched into a single history entry.
 *
 * @param params - Object mapping keys to MultiParam types
 * @param push - Use pushState (true) or replaceState (false) when updating
 * @returns Object with decoded values and update function
 *
 * @example
 * ```tsx
 * const { values, setValues } = useMultiUrlParams({
 *   tags: multiStringParam(),
 *   ids: multiIntParam()
 * })
 *
 * // Update multiple multi-value params at once
 * setValues({ tags: ['a', 'b'], ids: [1, 2, 3] })
 * ```
 */
export function useMultiUrlParams<P extends Record<string, MultiParam<any>>>(
  params: P,
  push = false
): {
  values: { [K in keyof P]: P[K] extends MultiParam<infer T> ? T : never }
  setValues: (updates: Partial<{ [K in keyof P]: P[K] extends MultiParam<infer T> ? T : never }>) => void
} {
  const strategy = getDefaultStrategy()

  // Subscribe to URL changes
  const urlParams = useSyncExternalStore(
    (cb) => strategy.subscribe(cb),
    () => getSnapshot(strategy),
    getServerSnapshot
  )

  // Decode all values from URL
  const values = Object.fromEntries(
    Object.entries(params).map(([key, param]) => [
      key,
      param.decode(urlParams[key] ?? [])
    ])
  ) as { [K in keyof P]: P[K] extends MultiParam<infer T> ? T : never }

  // Update multiple parameters at once
  const setValues = useCallback(
    (updates: Partial<{ [K in keyof P]: P[K] extends MultiParam<infer T> ? T : never }>) => {
      if (typeof window === 'undefined') return

      const currentParams = strategy.parse()

      // Apply all updates
      for (const [key, value] of Object.entries(updates)) {
        const param = params[key]
        if (!param) continue

        const encoded = param.encode(value)
        if (encoded.length === 0) {
          delete currentParams[key]
        } else {
          currentParams[key] = encoded
        }
      }

      // Build and update URL once
      const url = new URL(window.location.href)
      const newUrl = strategy.buildUrl(url, currentParams)

      const method = push ? 'pushState' : 'replaceState'
      window.history[method]({}, '', newUrl)

      // Trigger events to notify other hooks
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
    [params, push, strategy]
  )

  return { values, setValues }
}
