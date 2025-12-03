'use strict';

var react = require('react');

// src/core.ts
function parseMultiParams(source) {
  const searchParams = typeof source === "string" ? new URLSearchParams(source) : source;
  const result = {};
  const keys = new Set(searchParams.keys());
  for (const key of keys) {
    result[key] = searchParams.getAll(key);
  }
  return result;
}
function serializeMultiParams(params) {
  const searchParams = new URLSearchParams();
  for (const [key, values] of Object.entries(params)) {
    for (const value of values) {
      if (value === "") {
        continue;
      }
      searchParams.append(key, value);
    }
  }
  let result = searchParams.toString();
  const valuelessKeys = Object.entries(params).filter(([_, values]) => values.includes("")).map(([key, _]) => encodeURIComponent(key));
  if (valuelessKeys.length > 0) {
    const valuelessPart = valuelessKeys.join("&");
    result = result ? `${result}&${valuelessPart}` : valuelessPart;
  }
  return result;
}
var queryStrategy = {
  getRaw() {
    if (typeof window === "undefined") return "";
    return window.location.search;
  },
  parse() {
    if (typeof window === "undefined") return {};
    return parseMultiParams(window.location.search);
  },
  buildUrl(base, params) {
    base.search = serializeMultiParams(params);
    return base.toString();
  },
  subscribe(callback) {
    if (typeof window === "undefined") return () => {
    };
    window.addEventListener("popstate", callback);
    return () => window.removeEventListener("popstate", callback);
  }
};
var hashStrategy = {
  getRaw() {
    if (typeof window === "undefined") return "";
    return window.location.hash;
  },
  parse() {
    if (typeof window === "undefined") return {};
    const hash = window.location.hash;
    const hashString = hash.startsWith("#") ? hash.slice(1) : hash;
    return parseMultiParams(hashString);
  },
  buildUrl(base, params) {
    base.hash = serializeMultiParams(params);
    return base.toString();
  },
  subscribe(callback) {
    if (typeof window === "undefined") return () => {
    };
    window.addEventListener("hashchange", callback);
    window.addEventListener("popstate", callback);
    return () => {
      window.removeEventListener("hashchange", callback);
      window.removeEventListener("popstate", callback);
    };
  }
};
var defaultStrategy = queryStrategy;
function getDefaultStrategy() {
  return defaultStrategy;
}
function setDefaultStrategy(strategy) {
  defaultStrategy = strategy;
}

// src/params.ts
function stringParam(init) {
  return {
    encode: (value) => value === init ? void 0 : value,
    decode: (encoded) => encoded === void 0 ? init : encoded
  };
}
function defStringParam(init) {
  return {
    encode: (value) => value === init ? void 0 : value,
    decode: (encoded) => encoded ?? init
  };
}
var boolParam = {
  encode: (value) => value ? "" : void 0,
  decode: (encoded) => encoded !== void 0
};
function intParam(init) {
  return {
    encode: (value) => value === init ? void 0 : value.toString(),
    decode: (encoded) => encoded !== void 0 ? parseInt(encoded, 10) : init
  };
}
var optIntParam = {
  encode: (value) => value === null ? void 0 : value.toString(),
  decode: (encoded) => encoded !== void 0 ? parseInt(encoded, 10) : null
};
function floatParam(init) {
  return {
    encode: (value) => value === init ? void 0 : value.toString(),
    decode: (encoded) => encoded !== void 0 ? parseFloat(encoded) : init
  };
}
function enumParam(init, values) {
  const validSet = new Set(values);
  return {
    encode: (value) => {
      if (!validSet.has(value)) {
        console.warn(`Invalid enum value: ${value}, expected one of ${values.join(", ")}`);
        return void 0;
      }
      return value === init ? void 0 : value;
    },
    decode: (encoded) => {
      if (encoded === void 0) return init;
      if (!validSet.has(encoded)) {
        console.warn(`Invalid enum value: ${encoded}, expected one of ${values.join(", ")}. Using default: ${init}`);
        return init;
      }
      return encoded;
    }
  };
}
function stringsParam(init = [], delimiter = " ") {
  const initEncoded = init.join(delimiter);
  return {
    encode: (values) => {
      const encoded = values.join(delimiter);
      if (encoded === initEncoded) return void 0;
      return encoded;
    },
    decode: (encoded) => {
      if (encoded === void 0) return init;
      if (encoded === "") return [];
      return encoded.split(delimiter);
    }
  };
}
function numberArrayParam(init = []) {
  const isEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  return {
    encode: (values) => {
      if (isEqual(values, init)) return void 0;
      return values.map((v) => v.toString()).join(",");
    },
    decode: (encoded) => {
      if (encoded === void 0) return init;
      if (encoded === "") return [];
      return encoded.split(",").map((v) => parseFloat(v));
    }
  };
}

// src/multiParams.ts
function multiStringParam(init = []) {
  return {
    encode: (values) => {
      if (values.length === 0 && init.length === 0) return [];
      if (arraysEqual(values, init)) return [];
      return values;
    },
    decode: (encoded) => {
      if (encoded.length === 0) return init;
      return encoded;
    }
  };
}
function multiIntParam(init = []) {
  return {
    encode: (values) => {
      if (values.length === 0 && init.length === 0) return [];
      if (arraysEqual(values, init)) return [];
      return values.map((v) => v.toString());
    },
    decode: (encoded) => {
      if (encoded.length === 0) return init;
      return encoded.map((v) => parseInt(v, 10));
    }
  };
}
function multiFloatParam(init = []) {
  return {
    encode: (values) => {
      if (values.length === 0 && init.length === 0) return [];
      if (arraysEqual(values, init)) return [];
      return values.map((v) => v.toString());
    },
    decode: (encoded) => {
      if (encoded.length === 0) return init;
      return encoded.map((v) => parseFloat(v));
    }
  };
}
function arraysEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
var snapshotCache = /* @__PURE__ */ new WeakMap();
function getSnapshot(strategy) {
  const raw = strategy.getRaw();
  const cached = snapshotCache.get(strategy);
  if (cached && cached.raw === raw) {
    return cached.snapshot;
  }
  const snapshot = strategy.parse();
  snapshotCache.set(strategy, { raw, snapshot });
  return snapshot;
}
function getServerSnapshot() {
  return {};
}
function multiToSingle(multi) {
  if (multi.length === 0) return void 0;
  return multi[0];
}
function useUrlParam(key, param, push = false) {
  const strategy = getDefaultStrategy();
  const paramRef = react.useRef(param);
  paramRef.current = param;
  const urlParams = react.useSyncExternalStore(
    (cb) => strategy.subscribe(cb),
    () => getSnapshot(strategy),
    getServerSnapshot
  );
  const encoded = multiToSingle(urlParams[key] ?? []);
  const cacheRef = react.useRef(null);
  if (cacheRef.current === null || cacheRef.current.encoded !== encoded || cacheRef.current.param !== param) {
    cacheRef.current = { encoded, param, decoded: param.decode(encoded) };
  }
  const value = cacheRef.current.decoded;
  const setValue = react.useCallback(
    (newValue) => {
      if (typeof window === "undefined") return;
      const currentParams = strategy.parse();
      const encoded2 = paramRef.current.encode(newValue);
      if (encoded2 === void 0) {
        delete currentParams[key];
      } else {
        currentParams[key] = [encoded2];
      }
      const url = new URL(window.location.href);
      const newUrl = strategy.buildUrl(url, currentParams);
      const method = push ? "pushState" : "replaceState";
      window.history[method]({}, "", newUrl);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [key, push, strategy]
  );
  return [value, setValue];
}
function useUrlParams(params, push = false) {
  const strategy = getDefaultStrategy();
  const urlParams = react.useSyncExternalStore(
    (cb) => strategy.subscribe(cb),
    () => getSnapshot(strategy),
    getServerSnapshot
  );
  const values = Object.fromEntries(
    Object.entries(params).map(([key, param]) => [
      key,
      param.decode(multiToSingle(urlParams[key] ?? []))
    ])
  );
  const setValues = react.useCallback(
    (updates) => {
      if (typeof window === "undefined") return;
      const currentParams = strategy.parse();
      for (const [key, value] of Object.entries(updates)) {
        const param = params[key];
        if (!param) continue;
        const encoded = param.encode(value);
        if (encoded === void 0) {
          delete currentParams[key];
        } else {
          currentParams[key] = [encoded];
        }
      }
      const url = new URL(window.location.href);
      const newUrl = strategy.buildUrl(url, currentParams);
      const method = push ? "pushState" : "replaceState";
      window.history[method]({}, "", newUrl);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [params, push, strategy]
  );
  return { values, setValues };
}
function useMultiUrlParam(key, param, push = false) {
  const strategy = getDefaultStrategy();
  const paramRef = react.useRef(param);
  paramRef.current = param;
  const urlParams = react.useSyncExternalStore(
    (cb) => strategy.subscribe(cb),
    () => getSnapshot(strategy),
    getServerSnapshot
  );
  const value = param.decode(urlParams[key] ?? []);
  const setValue = react.useCallback(
    (newValue) => {
      if (typeof window === "undefined") return;
      const currentParams = strategy.parse();
      const encoded = paramRef.current.encode(newValue);
      if (encoded.length === 0) {
        delete currentParams[key];
      } else {
        currentParams[key] = encoded;
      }
      const url = new URL(window.location.href);
      const newUrl = strategy.buildUrl(url, currentParams);
      const method = push ? "pushState" : "replaceState";
      window.history[method]({}, "", newUrl);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [key, push, strategy]
  );
  return [value, setValue];
}
function useMultiUrlParams(params, push = false) {
  const strategy = getDefaultStrategy();
  const urlParams = react.useSyncExternalStore(
    (cb) => strategy.subscribe(cb),
    () => getSnapshot(strategy),
    getServerSnapshot
  );
  const values = Object.fromEntries(
    Object.entries(params).map(([key, param]) => [
      key,
      param.decode(urlParams[key] ?? [])
    ])
  );
  const setValues = react.useCallback(
    (updates) => {
      if (typeof window === "undefined") return;
      const currentParams = strategy.parse();
      for (const [key, value] of Object.entries(updates)) {
        const param = params[key];
        if (!param) continue;
        const encoded = param.encode(value);
        if (encoded.length === 0) {
          delete currentParams[key];
        } else {
          currentParams[key] = encoded;
        }
      }
      const url = new URL(window.location.href);
      const newUrl = strategy.buildUrl(url, currentParams);
      const method = push ? "pushState" : "replaceState";
      window.history[method]({}, "", newUrl);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
    [params, push, strategy]
  );
  return { values, setValues };
}

// src/index.ts
function serializeParams(params) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === void 0) {
      continue;
    } else if (value === "") {
      continue;
    } else {
      searchParams.set(key, value);
    }
  }
  let result = searchParams.toString();
  const valuelessKeys = Object.entries(params).filter(([_, value]) => value === "").map(([key, _]) => encodeURIComponent(key));
  if (valuelessKeys.length > 0) {
    const valuelessPart = valuelessKeys.join("&");
    result = result ? `${result}&${valuelessPart}` : valuelessPart;
  }
  return result;
}
function parseParams(source) {
  const searchParams = typeof source === "string" ? new URLSearchParams(source) : source;
  const result = {};
  for (const [key, value] of searchParams.entries()) {
    if (!(key in result)) {
      result[key] = value;
    }
  }
  return result;
}
function getCurrentParams() {
  if (typeof window === "undefined") return {};
  return parseParams(window.location.search);
}
function updateUrl(params, push = false) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const search = serializeParams(params);
  url.search = search;
  const method = push ? "pushState" : "replaceState";
  window.history[method]({}, "", url.toString());
}

// src/hash.ts
setDefaultStrategy(hashStrategy);

exports.boolParam = boolParam;
exports.defStringParam = defStringParam;
exports.enumParam = enumParam;
exports.floatParam = floatParam;
exports.getCurrentParams = getCurrentParams;
exports.getDefaultStrategy = getDefaultStrategy;
exports.hashStrategy = hashStrategy;
exports.intParam = intParam;
exports.multiFloatParam = multiFloatParam;
exports.multiIntParam = multiIntParam;
exports.multiStringParam = multiStringParam;
exports.numberArrayParam = numberArrayParam;
exports.optIntParam = optIntParam;
exports.parseMultiParams = parseMultiParams;
exports.parseParams = parseParams;
exports.queryStrategy = queryStrategy;
exports.serializeMultiParams = serializeMultiParams;
exports.serializeParams = serializeParams;
exports.setDefaultStrategy = setDefaultStrategy;
exports.stringParam = stringParam;
exports.stringsParam = stringsParam;
exports.updateUrl = updateUrl;
exports.useMultiUrlParam = useMultiUrlParam;
exports.useMultiUrlParams = useMultiUrlParams;
exports.useUrlParam = useUrlParam;
exports.useUrlParams = useUrlParams;
//# sourceMappingURL=hash.cjs.map
//# sourceMappingURL=hash.cjs.map