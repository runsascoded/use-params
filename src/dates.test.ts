// A URL people share, so the encoding is a wire format: every case below is a promise
// that a link keeps working. Round-trip is the property that matters, but the exact
// strings are pinned too — a "harmless" change to them silently breaks old links.
import { describe, expect, it } from 'vitest'
import { datesParam, decodeDates, encodeDates } from './dates.js'

describe('encodeDates', () => {
  it('contracts a run of consecutive days into one token', () => {
    const week = [
      '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
      '2026-08-22', '2026-08-23', '2026-08-24',
    ]
    expect(encodeDates(week)).toBe('260818-24')
    // The whole point: 90 chars of `?c=2026-08-24%2C…` becomes 9
    expect(encodeDates(week)!.length).toBe(9)
  })

  it('drops the digits each token shares with the one before it', () => {
    // Aug 24 inherits the month from Aug 5, so it costs two digits, not four
    expect(encodeDates(['2026-07-31', '2026-08-05', '2026-08-24', '2026-08-25']))
      .toBe('260731 0805 24-25')
  })

  it('spells out a year change in full, then abbreviates again', () => {
    expect(encodeDates(['2025-12-29', '2026-01-02', '2026-01-09']))
      .toBe('251229 260102 09')
  })

  it('sorts and dedupes, so the same set is always the same string', () => {
    expect(encodeDates(['2026-08-24', '2026-08-22', '2026-08-24'])).toBe('260822 24')
  })

  it('leaves the param out of the URL entirely when nothing is selected', () => {
    expect(encodeDates([])).toBeUndefined()
    expect(encodeDates(['nonsense'])).toBeUndefined()
  })

  it('uses the full 8-digit form outside 2000-2099', () => {
    expect(encodeDates(['1999-12-31', '2100-01-01'])).toBe('19991231 21000101')
  })

  it('inherits digits after the 8-digit escape hatch, same as after 6-digit', () => {
    // Once we've written the full year, later same-year dates still contract to 2 or 4
    expect(encodeDates(['1999-12-29', '1999-12-31'])).toBe('19991229 31')
    expect(encodeDates(['2100-01-01', '2100-03-05'])).toBe('21000101 0305')
  })
})

describe('decodeDates', () => {
  it('expands runs and inherited digits', () => {
    expect(decodeDates('260731 0805 0824-25')).toEqual([
      '2026-07-31', '2026-08-05', '2026-08-24', '2026-08-25',
    ])
  })

  it('reads a literal + as the separator too, since that is what the URL bar shows', () => {
    expect(decodeDates('260822+24')).toEqual(['2026-08-22', '2026-08-24'])
  })

  it('carries the range end into the next token, not the range start', () => {
    // 24 through Sep 2, then 05 (Sep 5) — Sep 5 must inherit "202609", not "202608"
    expect(decodeDates('260824-0902 05')).toEqual([
      '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28',
      '2026-08-29', '2026-08-30', '2026-08-31', '2026-09-01', '2026-09-02',
      '2026-09-05',
    ])
  })

  it('is absent-safe and empty-safe', () => {
    expect(decodeDates(undefined)).toEqual([])
    expect(decodeDates('')).toEqual([])
  })

  it('skips a leading abbreviated token (nothing to inherit from)', () => {
    expect(decodeDates('24 260822')).toEqual(['2026-08-22'])
  })

  it('rejects a non-existent calendar date (0231) instead of normalizing it', () => {
    expect(decodeDates('260822 0231 24')).toEqual(['2026-08-22', '2026-08-24'])
  })

  it('treats a backwards range as a typo, keeping only its start', () => {
    expect(decodeDates('260824-22')).toEqual(['2026-08-24'])
  })
})

describe('round trip', () => {
  const cases: [string, string[]][] = [
    ['260824',           ['2026-08-24']],
    ['260818-20',        ['2026-08-18', '2026-08-19', '2026-08-20']],
    ['260731 0805 24-25', ['2026-07-31', '2026-08-05', '2026-08-24', '2026-08-25']],
    ['251229-260101',    ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01']],
    ['240228-0301',      ['2024-02-28', '2024-02-29', '2024-03-01']], // leap day + spanning run
  ]
  for (const [encoded, dates] of cases) {
    it(`encodes ${JSON.stringify(dates)} to '${encoded}' and back`, () => {
      expect(encodeDates(dates)).toBe(encoded)
      expect(decodeDates(encoded)).toEqual(dates)
    })
  }
})

describe('datesParam', () => {
  it('exports encode/decode as a Param', () => {
    expect(datesParam.encode(['2026-08-24'])).toBe('260824')
    expect(datesParam.decode('260824')).toEqual(['2026-08-24'])
  })
})
