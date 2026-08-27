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
  it('is a factory that returns a Param wrapping encode/decode', () => {
    const p = datesParam()
    expect(p.encode(['2026-08-24'])).toBe('260824')
    expect(p.decode('260824')).toEqual(['2026-08-24'])
  })

  it('threads its options through to encode and decode', () => {
    const p = datesParam({ latest: '2026-08-24' })
    expect(p.encode(['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24']))
      .toBe('260818-')
    expect(p.decode('260818-')).toEqual([
      '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21',
      '2026-08-22', '2026-08-23', '2026-08-24',
    ])
  })
})

describe('half-open ranges', () => {
  describe('latest anchor (right end)', () => {
    it('encodes a run ending at latest (string) as `start-`', () => {
      expect(encodeDates(['2026-08-18', '2026-08-19', '2026-08-20'], { latest: '2026-08-20' }))
        .toBe('260818-')
    })

    it('encodes a run ending at latest (callback) as `start-`, calling it fresh', () => {
      let latestValue = '2026-08-20'
      const latest = () => latestValue
      expect(encodeDates(['2026-08-18', '2026-08-19', '2026-08-20'], { latest }))
        .toBe('260818-')
      // A different `latest` gives a different encoding for the same input
      latestValue = '2026-08-25'
      expect(encodeDates(['2026-08-18', '2026-08-19', '2026-08-20'], { latest }))
        .toBe('260818-20')
    })

    it('leaves a run whose end isn`t at latest fully spelled out', () => {
      expect(encodeDates(['2026-08-18', '2026-08-19', '2026-08-20'], { latest: '2026-08-25' }))
        .toBe('260818-20')
    })

    it('encodes a single day at latest as a single date, not `D-`', () => {
      // Single-day tokens stay single — `260820-` would be one char longer for no reason
      expect(encodeDates(['2026-08-20'], { latest: '2026-08-20' })).toBe('260820')
    })

    it('decodes `D-` (string latest) to the full inclusive range', () => {
      expect(decodeDates('260818-', { latest: '2026-08-20' }))
        .toEqual(['2026-08-18', '2026-08-19', '2026-08-20'])
    })

    it('decodes `D-` (callback latest), resolved fresh each call', () => {
      let latestValue = '2026-08-20'
      const latest = () => latestValue
      expect(decodeDates('260818-', { latest }))
        .toEqual(['2026-08-18', '2026-08-19', '2026-08-20'])
      // Move `latest` forward; the same URL now covers more days — the point of half-open
      latestValue = '2026-08-22'
      expect(decodeDates('260818-', { latest }))
        .toEqual(['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22'])
    })

    it('skips a `D-` token when latest isn`t configured', () => {
      // No anchor → the token has no end → drop it (lenient decode contract)
      expect(decodeDates('260818-', {})).toEqual([])
      // But other tokens in the same string still decode
      expect(decodeDates('260818- 260822', {})).toEqual(['2026-08-22'])
    })

    it('treats `D-` with latest < D as a backwards range, keeping only D', () => {
      expect(decodeDates('260830-', { latest: '2026-08-20' })).toEqual(['2026-08-30'])
    })

    it('inherits digits from `latest` into the next token', () => {
      // After `260818-` (which decodes to a range ending Aug 20), the next token's prev
      // is `latest`, so `25` expands relative to Aug 20 → Aug 25.
      expect(decodeDates('260818- 25', { latest: '2026-08-20' }))
        .toEqual(['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-25'])
    })
  })

  describe('genesis anchor (left end)', () => {
    it('encodes a run starting at genesis (string) as `-end`', () => {
      expect(encodeDates(['2026-08-18', '2026-08-19', '2026-08-20'], { genesis: '2026-08-18' }))
        .toBe('-20')
    })

    it('encodes a run starting at genesis (callback) as `-end`', () => {
      const genesis = () => '2026-08-18'
      expect(encodeDates(['2026-08-18', '2026-08-19', '2026-08-20'], { genesis }))
        .toBe('-20')
    })

    it('leaves a run whose start isn`t at genesis fully spelled out', () => {
      expect(encodeDates(['2026-08-18', '2026-08-19', '2026-08-20'], { genesis: '2020-01-01' }))
        .toBe('260818-20')
    })

    it('encodes a single day at genesis as a single date, not `-D`', () => {
      expect(encodeDates(['2026-08-18'], { genesis: '2026-08-18' })).toBe('260818')
    })

    it('decodes `-D` (string genesis) to the full inclusive range', () => {
      expect(decodeDates('-20', { genesis: '2026-08-18' }))
        .toEqual(['2026-08-18', '2026-08-19', '2026-08-20'])
    })

    it('skips a `-D` token when genesis isn`t configured', () => {
      expect(decodeDates('-260820', {})).toEqual([])
    })

    it('treats `-D` with D < genesis as a backwards range, keeping only genesis', () => {
      // Backwards → keep the start (genesis), skip walking; matches D-D backwards behavior
      expect(decodeDates('-260810', { genesis: '2026-08-20' })).toEqual(['2026-08-20'])
    })

    it('inherits digits from the end date into the next token', () => {
      // After `-20` (expands to Aug 20), the next token's prev is Aug 20 → `25` → Aug 25
      expect(decodeDates('-20 25', { genesis: '2026-08-18' }))
        .toEqual(['2026-08-18', '2026-08-19', '2026-08-20', '2026-08-25'])
    })
  })

  describe('both anchors together', () => {
    const both = { genesis: '2026-08-01', latest: '2026-08-31' }

    it('prefers the latest form when a run touches both ends', () => {
      const full = Array.from({ length: 31 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`)
      // Both would apply; picks `D-` (start-anchored to latest), not `-D`
      expect(encodeDates(full, both)).toBe('260801-')
    })

    it('mixes half-open and closed runs in one string', () => {
      // Aug 01–03 → `-03` (end inherits 6 digits from genesis Aug 01); Aug 10 stands alone
      // (inherits from Aug 03, so just `10`); Aug 20–31 ends at latest → `20-`.
      expect(encodeDates([
        '2026-08-01', '2026-08-02', '2026-08-03',
        '2026-08-10',
        '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24',
        '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29',
        '2026-08-30', '2026-08-31',
      ], both)).toBe('-03 10 20-')
    })

    it('round-trips the mixed encoding', () => {
      const dates = [
        '2026-08-01', '2026-08-02', '2026-08-03',
        '2026-08-10',
        '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24',
        '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29',
        '2026-08-30', '2026-08-31',
      ]
      expect(decodeDates(encodeDates(dates, both), both)).toEqual(dates)
    })
  })

  describe('round trip', () => {
    const cases: [string, string[], { latest?: string; genesis?: string }][] = [
      ['260818-', ['2026-08-18', '2026-08-19', '2026-08-20'], { latest: '2026-08-20' }],
      ['-20',    ['2026-08-18', '2026-08-19', '2026-08-20'], { genesis: '2026-08-18' }],
      ['260801-', Array.from({ length: 31 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`),
        { latest: '2026-08-31', genesis: '2026-08-01' }],
    ]
    for (const [encoded, dates, opts] of cases) {
      it(`encodes ${JSON.stringify(dates.length === 1 ? dates : `[${dates[0]}..${dates[dates.length - 1]}]`)} with ${JSON.stringify(opts)} to '${encoded}'`, () => {
        expect(encodeDates(dates, opts)).toBe(encoded)
        expect(decodeDates(encoded, opts)).toEqual(dates)
      })
    }
  })
})
