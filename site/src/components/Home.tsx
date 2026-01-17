import { useLocation, Link } from 'react-router-dom'
import {
  useUrlParam,
  useUrlParams,
  useMultiUrlParam,
  boolParam,
  stringParam,
  intParam,
  floatParam,
  enumParam,
  stringsParam,
  paginationParam,
  codeParam,
  codesParam,
  multiStringParam,
  multiIntParam,
} from 'use-prms'

const themes = ['light', 'dark', 'auto'] as const
type Theme = typeof themes[number]

const metrics = { Rides: 'r', Minutes: 'm', Distance: 'd' } as const
type Metric = keyof typeof metrics

const regions = ['NYC', 'JC', 'HOB'] as const
type Region = typeof regions[number]
const regionCodes = { NYC: 'n', JC: 'j', HOB: 'h' } as const

export function Home() {
  const location = useLocation()

  // Basic params
  const [enabled, setEnabled] = useUrlParam('e', boolParam)
  const [name, setName] = useUrlParam('n', stringParam())
  const [count, setCount] = useUrlParam('c', intParam(0))
  const [ratio, setRatio] = useUrlParam('r', floatParam(1.0))
  const [theme, setTheme] = useUrlParam('t', enumParam<Theme>('light', themes))

  // Array params
  const [tags, setTags] = useUrlParam('tags', stringsParam([], ','))

  // Pagination
  const [page, setPage] = useUrlParam('p', paginationParam(20, [10, 20, 50, 100]))

  // Code params
  const [metric, setMetric] = useUrlParam('y', codeParam<Metric>('Rides', metrics))
  const [selectedRegions, setSelectedRegions] = useUrlParam('rg', codesParam<Region>([...regions], regionCodes))

  // Multi-value params
  const [multiTags, setMultiTags] = useMultiUrlParam('tag', multiStringParam())
  const [multiIds, setMultiIds] = useMultiUrlParam('id', multiIntParam())

  // Batch params
  const { values: batch, setValues: setBatch } = useUrlParams({
    x: intParam(0),
    y: intParam(0),
  })

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag))
    } else {
      setTags([...tags, tag])
    }
  }

  const toggleRegion = (region: Region) => {
    if (selectedRegions.includes(region)) {
      setSelectedRegions(selectedRegions.filter(r => r !== region))
    } else {
      setSelectedRegions([...selectedRegions, region])
    }
  }

  const toggleMultiTag = (tag: string) => {
    if (multiTags.includes(tag)) {
      setMultiTags(multiTags.filter(t => t !== tag))
    } else {
      setMultiTags([...multiTags, tag])
    }
  }

  return (
    <>
      <h1>use-prms</h1>
      <p className="subtitle">
        Type-safe URL parameter management with minimal encoding.
        {' '}<Link to="/hash">Try hash params</Link>
      </p>

      <div className="url-display">
        {location.pathname}{location.search || '(no params)'}
      </div>

      {/* Boolean */}
      <section className="section">
        <h2>Boolean (boolParam)</h2>
        <div className="controls">
          <button className={enabled ? 'active' : ''} onClick={() => setEnabled(!enabled)}>
            {enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className="value-display">?e = {enabled ? 'present (true)' : 'absent (false)'}</div>
      </section>

      {/* String */}
      <section className="section">
        <h2>String (stringParam)</h2>
        <div className="controls">
          <div className="control-group">
            <label>Name</label>
            <input
              type="text"
              value={name ?? ''}
              onChange={e => setName(e.target.value || undefined)}
              placeholder="Enter name..."
            />
          </div>
        </div>
        <div className="value-display">?n={name ?? '(undefined)'}</div>
      </section>

      {/* Numbers */}
      <section className="section">
        <h2>Numbers (intParam, floatParam)</h2>
        <div className="controls">
          <div className="control-group">
            <label>Count (int, default=0)</label>
            <input
              type="number"
              value={count}
              onChange={e => setCount(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="control-group">
            <label>Ratio (float, default=1.0)</label>
            <input
              type="number"
              step="0.1"
              value={ratio}
              onChange={e => setRatio(parseFloat(e.target.value) || 1.0)}
            />
          </div>
        </div>
        <div className="value-display">
          ?c={count === 0 ? '(omitted, default)' : count}
          {' '}&amp; ?r={ratio === 1.0 ? '(omitted, default)' : ratio}
        </div>
      </section>

      {/* Enum */}
      <section className="section">
        <h2>Enum (enumParam)</h2>
        <div className="controls">
          {themes.map(t => (
            <button
              key={t}
              className={theme === t ? 'active' : ''}
              onClick={() => setTheme(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="value-display">?t={theme === 'light' ? '(omitted, default)' : theme}</div>
      </section>

      {/* Strings Array */}
      <section className="section">
        <h2>String Array (stringsParam)</h2>
        <div className="controls">
          <div className="tag-list">
            {['react', 'vue', 'svelte', 'solid'].map(tag => (
              <span
                key={tag}
                className={`tag ${tags.includes(tag) ? 'selected' : ''}`}
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="value-display">
          ?tags={tags.length > 0 ? tags.join(',') : '(empty)'}
        </div>
      </section>

      {/* Pagination */}
      <section className="section">
        <h2>Pagination (paginationParam)</h2>
        <div className="controls">
          <div className="control-group">
            <label>Offset</label>
            <input
              type="number"
              value={page.offset}
              step={page.pageSize}
              onChange={e => setPage({ ...page, offset: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="control-group">
            <label>Page Size</label>
            <select
              value={page.pageSize}
              onChange={e => setPage({ ...page, pageSize: parseInt(e.target.value) })}
            >
              {[10, 20, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <button onClick={() => setPage({ ...page, offset: page.offset + page.pageSize })}>
            Next Page
          </button>
        </div>
        <div className="value-display">
          ?p={page.offset === 0 && page.pageSize === 20
            ? '(omitted, default)'
            : `${page.offset || ''} ${page.pageSize !== 20 ? page.pageSize : ''}`.trim() || '(offset only)'}
        </div>
      </section>

      {/* Code Params */}
      <section className="section">
        <h2>Code Mapping (codeParam, codesParam)</h2>
        <div className="controls">
          <div className="control-group">
            <label>Metric (single)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(Object.keys(metrics) as Metric[]).map(m => (
                <button
                  key={m}
                  className={metric === m ? 'active' : ''}
                  onClick={() => setMetric(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="control-group">
            <label>Regions (multi)</label>
            <div className="tag-list">
              {regions.map(r => (
                <span
                  key={r}
                  className={`tag ${selectedRegions.includes(r) ? 'selected' : ''}`}
                  onClick={() => toggleRegion(r)}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="value-display">
          ?y={metric === 'Rides' ? '(omitted)' : metrics[metric]}
          {' '}&amp; ?rg={selectedRegions.length === regions.length
            ? '(omitted, all selected)'
            : selectedRegions.map(r => regionCodes[r]).join('')}
        </div>
      </section>

      {/* Multi-value params */}
      <section className="section">
        <h2>Multi-Value (useMultiUrlParam)</h2>
        <div className="controls">
          <div className="control-group">
            <label>Tags (repeated keys)</label>
            <div className="tag-list">
              {['alpha', 'beta', 'gamma'].map(tag => (
                <span
                  key={tag}
                  className={`tag ${multiTags.includes(tag) ? 'selected' : ''}`}
                  onClick={() => toggleMultiTag(tag)}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div className="control-group">
            <label>IDs</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3].map(id => (
                <button
                  key={id}
                  className={multiIds.includes(id) ? 'active' : ''}
                  onClick={() => {
                    if (multiIds.includes(id)) {
                      setMultiIds(multiIds.filter(i => i !== id))
                    } else {
                      setMultiIds([...multiIds, id])
                    }
                  }}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="value-display">
          ?tag={multiTags.length > 0 ? multiTags.map(t => `tag=${t}`).join('&') : '(none)'}
          {' '}&amp; ?id={multiIds.length > 0 ? multiIds.map(i => `id=${i}`).join('&') : '(none)'}
        </div>
      </section>

      {/* Batch Updates */}
      <section className="section">
        <h2>Batch Updates (useUrlParams)</h2>
        <div className="controls">
          <div className="control-group">
            <label>X</label>
            <input
              type="number"
              value={batch.x}
              onChange={e => setBatch({ x: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="control-group">
            <label>Y</label>
            <input
              type="number"
              value={batch.y}
              onChange={e => setBatch({ y: parseInt(e.target.value) || 0 })}
            />
          </div>
          <button onClick={() => setBatch({ x: 100, y: 200 })}>
            Set (100, 200)
          </button>
          <button onClick={() => setBatch({ x: 0, y: 0 })}>
            Reset
          </button>
        </div>
        <div className="value-display">
          ?x={batch.x === 0 ? '(omitted)' : batch.x}
          {' '}&amp; ?y={batch.y === 0 ? '(omitted)' : batch.y}
        </div>
      </section>
    </>
  )
}
