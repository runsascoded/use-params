import { useLocation, Link } from 'react-router-dom'
import {
  useUrlParam,
  boolParam,
  stringParam,
  intParam,
  enumParam,
} from 'use-prms/hash'

const themes = ['light', 'dark', 'auto'] as const
type Theme = typeof themes[number]

export function HashDemo() {
  const location = useLocation()

  const [enabled, setEnabled] = useUrlParam('e', boolParam)
  const [name, setName] = useUrlParam('n', stringParam())
  const [count, setCount] = useUrlParam('c', intParam(0))
  const [theme, setTheme] = useUrlParam('t', enumParam<Theme>('light', themes))

  return (
    <>
      <h1>Hash Params Demo</h1>
      <p className="subtitle">
        Same API, but params go in the hash fragment (#) instead of query string (?).
        {' '}<Link to="/">Back to query params</Link>
      </p>

      <div className="url-display">
        {location.pathname}{location.hash || '#(no params)'}
      </div>

      {/* Boolean */}
      <section className="section">
        <h2>Boolean (boolParam)</h2>
        <div className="controls">
          <button className={enabled ? 'active' : ''} onClick={() => setEnabled(!enabled)}>
            {enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        <div className="value-display">#e = {enabled ? 'present (true)' : 'absent (false)'}</div>
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
        <div className="value-display">#n={name ?? '(undefined)'}</div>
      </section>

      {/* Number */}
      <section className="section">
        <h2>Number (intParam)</h2>
        <div className="controls">
          <div className="control-group">
            <label>Count (default=0)</label>
            <input
              type="number"
              value={count}
              onChange={e => setCount(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <div className="value-display">#c={count === 0 ? '(omitted, default)' : count}</div>
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
        <div className="value-display">#t={theme === 'light' ? '(omitted, default)' : theme}</div>
      </section>

      <section className="section">
        <h2>Why Hash Params?</h2>
        <ul>
          <li>Hash changes don't trigger server requests</li>
          <li>Useful when query strings conflict with server routing</li>
          <li>Params survive page reloads without server involvement</li>
          <li>Same API - just change the import path to <code>use-prms/hash</code></li>
        </ul>
      </section>
    </>
  )
}
