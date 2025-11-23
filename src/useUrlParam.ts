/**
 * React hook for managing URL query parameters
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { Param } from './index.js'
import { getCurrentParams, parseParams, serializeParams } from './index.js'

/**
 * Subscribe to URL changes (popstate events)
 */
function subscribeToUrl(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  window.addEventListener('popstate', callback)
  return () => window.removeEventListener('popstate', callback)
}

/**
 * Get current URL search params as a snapshot
 */
function getUrlSnapshot(): Record<string, string | undefined> {
  return getCurrentParams()
}

/**
 * Server-side snapshot (always empty)
 */
function getServerSnapshot(): Record<string, string | undefined> {
  return {}
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
 * const [zoom, setZoom] = useUrlParam('z', boolParam())
 * const [device, setDevice] = useUrlParam('d', stringParam('default'))
 * ```
 */
export function useUrlParam<T>(
  key: string,
  param: Param<T>,
  push = false
): [T, (value: T) => void] {
  // Subscribe to URL changes
  const urlParams = useSyncExternalStore(
    subscribeToUrl,
    getUrlSnapshot,
    getServerSnapshot
  )

  // Decode current value from URL
  const value = param.decode(urlParams[key])

  // Update URL when value changes
  const setValue = useCallback(
    (newValue: T) => {
      if (typeof window === 'undefined') return

      const currentParams = getCurrentParams()
      const encoded = param.encode(newValue)

      // Update this parameter
      if (encoded === undefined) {
        delete currentParams[key]
      } else {
        currentParams[key] = encoded
      }

      // Serialize and update URL
      const url = new URL(window.location.href)
      url.search = serializeParams(currentParams)

      const method = push ? 'pushState' : 'replaceState'
      window.history[method]({}, '', url.toString())

      // Trigger popstate event to notify other hooks
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
    [key, param, push]
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
 *   zoom: boolParam(),
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
  // Subscribe to URL changes
  const urlParams = useSyncExternalStore(
    subscribeToUrl,
    getUrlSnapshot,
    getServerSnapshot
  )

  // Decode all values from URL
  const values = Object.fromEntries(
    Object.entries(params).map(([key, param]) => [
      key,
      param.decode(urlParams[key])
    ])
  ) as { [K in keyof P]: P[K] extends Param<infer T> ? T : never }

  // Update multiple parameters at once
  const setValues = useCallback(
    (updates: Partial<{ [K in keyof P]: P[K] extends Param<infer T> ? T : never }>) => {
      if (typeof window === 'undefined') return

      const currentParams = getCurrentParams()

      // Apply all updates
      for (const [key, value] of Object.entries(updates)) {
        const param = params[key]
        if (!param) continue

        const encoded = param.encode(value)
        if (encoded === undefined) {
          delete currentParams[key]
        } else {
          currentParams[key] = encoded
        }
      }

      // Serialize and update URL once
      const url = new URL(window.location.href)
      url.search = serializeParams(currentParams)

      const method = push ? 'pushState' : 'replaceState'
      window.history[method]({}, '', url.toString())

      // Trigger popstate event to notify other hooks
      window.dispatchEvent(new PopStateEvent('popstate'))
    },
    [params, push]
  )

  return { values, setValues }
}
