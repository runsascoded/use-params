# use-url-params

Type-safe URL query parameter management with minimal, human-readable encoding.

## Features

- 🎯 **Type-safe**: Full TypeScript support with generic `Param<T>` interface
- 📦 **Tiny URLs**: Smart encoding - omit defaults, use short keys, minimal syntax
- ⚛️ **React hook**: `useUrlParam(key, param)` for seamless integration
- 🔧 **Framework-agnostic**: Core works anywhere, React hook is optional
- 🌳 **Tree-shakeable**: ESM + CJS builds
- 0️⃣ **Zero dependencies**: Except React for the hook (peer dependency)

## Installation

```bash
pnpm add use-url-params
```

## Quick Start

```typescript
import { useUrlParam, boolParam, stringParam, intParam } from 'use-url-params'

function MyComponent() {
  const [zoom, setZoom] = useUrlParam('z', boolParam())
  const [device, setDevice] = useUrlParam('d', stringParam())
  const [count, setCount] = useUrlParam('n', intParam(10))

  // URL: ?z&d=gym&n=5
  // zoom = true, device = "gym", count = 5
}
```

## Built-in Param Types

- `stringParam(init?)` - optional string
- `boolParam()` - boolean (`?z` = true, absent = false)
- `intParam(init)` - integer with default
- `floatParam(init)` - float with default
- `enumParam(init, values)` - enum with validation
- `stringsParam(init, delimiter)` - string array
- More coming soon...

## Custom Params

```typescript
const myParam: Param<MyType> = {
  encode: (value) => value === default ? undefined : compactString,
  decode: (str) => str === undefined ? default : parseValue(str)
}
```

## Development

This library is currently in development. Contributions welcome!
