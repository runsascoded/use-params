# Add `datesParam`: a set of dates in a URL, contracted to runs

## Implementation deltas (2026-08-25)

Landed as `src/dates.ts` + `src/dates.test.ts` (20 tests) + a `Date Sets` section in
the README's `## Built-in Param Types` table + a "Date Sets (datesParam)" demo in the
kitchen-sink page (both `?dates=…` and `#dates=…` modes, keyed on `dates`).

Decisions on the [open questions](#open-questions-for-the-maintainer):

1. **Century window**: kept 6-digit `YYMMDD` (2000–2099) with 8-digit fallback. The
   README's Date Sets section flags this as a Y2K-shaped choice; the module JSDoc calls
   the 8-digit path an "escape hatch". Not worth eating two chars for every date to fix
   a boundary that costs one extra token per century.
2. **Ordering**: canonical ascending, no `{ order }` option. Sets → one canonical form.
3. **`{ ranges: false }` mode**: skipped (YAGNI). If a consumer surfaces it, add it then.
4. **Naming**: `datesParam`. Plain, matches `tagFilterParam` / `flagPackParam`.
5. **`dateRangeParam`**: not shipped in this PR. The digit-inheritance helper (`expand`
   /`contract`) is private for now; can promote to a shared module when a range param
   actually needs it.

Also **skipped** the sibling `targetParam`/`targetsParam` (spec called it a note, not a
proposal — `*` is only safe because of what GitHub forbids, and generalizing to
`pathParam({ sep })` is more design than payoff without a second consumer).

Filed by a consumer that just built it: [`watchy`]'s feed collapses days, and the
collapsed set lives in the URL. Working implementation + tests are at
`~/c/rac/watchy/www/src/dates.ts` and `www/test/dates.test.ts` (16 cases, all passing) —
lift them wholesale if the design below survives review.

The same commit adds a much smaller `targetParam`/`targetsParam` (`owner/repo` ↔
`owner*repo`); see [§ Sibling](#sibling-slash-free-path-params) for whether that belongs
here too.

## Motivation

A multi-day selection encoded the obvious way is almost all redundancy:

```
?c=2026-08-18%2C2026-08-19%2C2026-08-20%2C2026-08-21%2C2026-08-22%2C2026-08-23%2C2026-08-24
```

90 characters to say "last week is folded". Three things are wrong with it, and all
three are general to date-set params rather than specific to `watchy`:

1. **A selected set of days is usually a few runs**, not a scatter — "this week", "the
   last two weeks", "that month". Runs contract to one token each.
2. **Adjacent dates share almost all their digits.** Within a month, only the day
   changes; within a year, only month-day.
3. **`URLSearchParams` percent-encodes `,`** — the natural separator costs 3 characters
   per element. It leaves alphanumerics and `*-._` alone, and maps space ↔ `+`.

The same set, with all three applied:

```
?c=260818-24
```

`use-prms` already owns this genre of problem (`flagPack`, `numberTuple`, `binary`,
`tagFilter`), and this is the one shape those don't cover.

## Encoding

```
tokens   := token (' ' token)*          // space; URLSearchParams renders it as '+'
token    := date ('-' date)?            // a run, inclusive of both ends
date     := 2 | 4 | 6 | 8 digits        // DD | MMDD | YYMMDD | YYYYMMDD
```

- **Runs.** Calendar-consecutive dates collapse to `start-end`. Collapsing a week costs
  one token whatever its length.
- **Inherited digits.** Each token drops the leading digits it shares with the date
  before it (for a run's end, with its own start). The first token is never abbreviated.
  `260731 0805 24-25` = Jul 31, Aug 5, Aug 24–25 of 2026.
- **6 digits means `20YY`**; 8 digits is the escape hatch for anything outside 2000–2099.
- **Canonical form is sorted ascending and deduped**, so the same set is always the same
  string (a URL is a cache key and a thing people diff by eye).
- **Empty set ⇒ `undefined`**, i.e. the param is absent rather than present-and-empty.

Decoding is deliberately lenient: an unparseable token is skipped, not thrown. This is a
hand-editable URL, and a typo should cost one day's state rather than white-screening the
page. Decode also accepts a literal `+` as a separator, for the case where something
hands over the raw query string without form-decoding it.

## API

```ts
export const datesParam: Param<string[]>            // ISO 'YYYY-MM-DD' strings
export function encodeDates(dates: readonly string[]): string | undefined
export function decodeDates(encoded: string | undefined): string[]
```

`string[]` of ISO dates rather than `Date[]` on purpose: `Date` is a timestamp, and a
selected *day* is not one — round-tripping through `Date` invites exactly the local-vs-UTC
bug this param exists to avoid. Consumers that want `Date`s can map.

## Open questions for the maintainer

1. **Century window.** 6-digit years assume 2000–2099, with 8 digits as the escape
   hatch. Cheap and covers every real use, but it *is* a Y2K-shaped decision — say so in
   the README, or drop the 6-digit form and eat two characters?
2. **Ordering.** Canonical is ascending. `watchy` displays newest-first, so its URL reads
   backwards from its UI. An `{ order: 'asc' | 'desc' }` option would fix that at the
   cost of two canonical forms per set. My instinct is: don't — the param is a set, and
   one canonical form is worth more than matching a display order.
3. **Should runs be optional?** A `{ ranges: false }` mode (tokens only, still with
   inherited digits) would suit a param whose selections are typically scattered.
4. **Naming.** `datesParam` vs `dateSetParam` — it decodes to an array but means a set,
   and dedupes accordingly.
5. **A `Param<[from, to]>` range picker** is the adjacent thing this is *not*. Worth
   having as its own export (`dateRangeParam`), and it shares the digit-inheritance
   helper.

## Sibling: slash-free path params

Same PR in `watchy` adds, in `www/src/params.ts`:

```ts
export const targetParam: Param<string>    // 'owner/repo' <-> 'owner*repo'
export const targetsParam: Param<string[]> // space-separated, sorted, deduped
```

Motivation is one line of the same argument: `URLSearchParams` turns `/` into `%2F`, and
`*` is a character GitHub can't put in an owner or repo name. Decode accepts `/` as well,
so links written before the change keep working.

That's GitHub-shaped as written, but the general form isn't: a `Param` for
"slash-delimited path segments that shouldn't cost `%2F` each" would be a fine small
export (`pathParam({ sep: '*' })`), *if* the escape character is configurable — `*` is
only safe because of what GitHub forbids, and another consumer's names may contain it.
Filing it here as a note rather than a proposal; `datesParam` is the one that's worth it.

## Reference implementation

Verbatim from `watchy` (`www/src/dates.ts`), minus the consumer-specific doc comment:

```ts
const DAY_MS = 86_400_000
const TOKEN = /^(\d{2}|\d{4}|\d{6}|\d{8})(?:-(\d{2}|\d{4}|\d{6}|\d{8}))?$/

function ms(date: string): number {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN
}

function iso(t: number): string {
  return new Date(t).toISOString().slice(0, 10)
}

/** Expand a 2/4/6/8-digit token against the date before it. */
function expand(token: string, prev: string | null): string | null {
  const full = token.length === 8 ? token
    : token.length === 6 ? `20${token}`
    : prev === null ? null
    : prev.replace(/-/g, '').slice(0, 8 - token.length) + token
  if (full === null) return null
  const date = `${full.slice(0, 4)}-${full.slice(4, 6)}-${full.slice(6)}`
  // Round-trip through the calendar so 0231 / 0000 are rejected rather than normalized
  const t = ms(date)
  return !isNaN(t) && iso(t) === date ? date : null
}

/** The shortest token for `date` that `expand` will read back, given `prev`. */
function contract(date: string, prev: string | null): string {
  const d = date.replace(/-/g, '')
  if (prev === null) return d.startsWith('20') ? d.slice(2) : d
  const p = prev.replace(/-/g, '')
  if (p.slice(0, 6) === d.slice(0, 6)) return d.slice(6)
  if (p.slice(0, 4) === d.slice(0, 4)) return d.slice(4)
  return d.startsWith('20') ? d.slice(2) : d
}

export function encodeDates(dates: readonly string[]): string | undefined {
  const sorted = [...new Set(dates)].map(ms).filter(t => !isNaN(t)).sort((a, b) => a - b)
  if (!sorted.length) return undefined
  const runs: Array<[number, number]> = []
  for (const t of sorted) {
    const last = runs[runs.length - 1]
    if (last && t === last[1] + DAY_MS) last[1] = t
    else runs.push([t, t])
  }
  const tokens: string[] = []
  let prev: string | null = null
  for (const [from, to] of runs) {
    const start = iso(from)
    let token = contract(start, prev)
    prev = start
    if (to !== from) {
      const end = iso(to)
      token += `-${contract(end, prev)}`
      prev = end
    }
    tokens.push(token)
  }
  return tokens.join(' ')
}

export function decodeDates(encoded: string | undefined): string[] {
  if (!encoded) return []
  const out: string[] = []
  let prev: string | null = null
  for (const token of encoded.split(/[\s+]+/).filter(Boolean)) {
    const m = TOKEN.exec(token)
    if (!m) continue
    const start = expand(m[1], prev)
    if (!start) continue
    prev = start
    if (m[2] === undefined) { out.push(start); continue }
    const end = expand(m[2], start)
    // A backwards range is a typo, not an instruction to walk the calendar in reverse
    if (!end || ms(end) < ms(start)) { out.push(start); continue }
    for (let t = ms(start); t <= ms(end); t += DAY_MS) out.push(iso(t))
    prev = end
  }
  return [...new Set(out)]
}

export const datesParam: Param<string[]> = { encode: encodeDates, decode: decodeDates }
```

## Tests to port

`www/test/dates.test.ts` covers: run contraction (a week → 9 chars); digit inheritance
across month and year boundaries; sort/dedupe canonicalization; empty and invalid input;
the pre-2000/post-2099 8-digit path; `+` as separator; a range's end (not its start)
seeding the next token's inheritance; malformed-token tolerance (leading abbreviated
token, `0231`, backwards range); and round-trips including a leap day and a run spanning
one.

## Consumer follow-up

If this lands, `watchy` deletes `www/src/dates.ts` and imports from `use-prms` — ping
that repo (`~/c/rac/watchy`, branches `rw`/`oa`) and it'll swap in the same session.

[`watchy`]: https://github.com/runsascoded/watchy
