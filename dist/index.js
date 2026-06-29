// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
  };
};

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
};
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
var handleParsingAllValues = (form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
};
var handleParsingNestedValues = (form, key, value) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
};
var splitRoutingPath = (routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
};
var patternCache = {};
var getPattern = (label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
};
var tryDecode = (str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
};
var tryDecodeURI = (str) => tryDecode(str, decodeURI);
var getPath = (request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
};
var getPathNoStrict = (request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
};
var mergePath = (base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
};
var checkOptionalParameter = (path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
};
var _getQueryParam = (url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
  return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = (str) => tryDecode(str, decodeURIComponent_);
var HonoRequest = class {
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param && /\%/.test(param) ? tryDecodeURIComponent(param) : param;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = (key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  };
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = (value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
};

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = (contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
};
var createResponseInstance = (body, init) => new Response(body, init);
var Context = class {
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = (...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  };
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = (layout) => this.#layout = layout;
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = () => this.#layout;
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = (renderer) => {
    this.#renderer = renderer;
  };
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = (name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  };
  status = (status) => {
    this.#status = status;
  };
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = (key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  };
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = (key) => {
    return this.#var ? this.#var.get(key) : void 0;
  };
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, { status, headers: responseHeaders });
  }
  newResponse = (...args) => this.#newResponse(...args);
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = (data, arg, headers) => this.#newResponse(data, arg, headers);
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = (text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  };
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = (object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  };
  html = (html, arg, headers) => {
    const res = (html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers));
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  };
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = (location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  };
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = () => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  };
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = (c) => {
  return c.text("404 Not Found", 404);
};
var errorHandler = (err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
};
var Hono = class _Hono {
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = (handler) => {
    this.errorHandler = handler;
    return this;
  };
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = (handler) => {
    this.#notFoundHandler = handler;
    return this;
  };
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = (request) => request;
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    };
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} Env - env Object
   * @param {ExecutionContext} - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = (request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  };
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = (input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  };
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = () => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  };
};

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = ((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  });
  this.match = match2;
  return match2(method, path);
}

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
var Node = class _Node {
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new _Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new _Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
var RegExpRouter = class {
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    clearWildcardRegExpCache();
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router8 = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router8.add(...routes[i2]);
        }
        res = router8.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router8.match.bind(router8);
      this.#routers = [router8];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var hasChildren = (children) => {
  for (const _ in children) {
    return true;
  }
  return false;
};
var Node2 = class _Node2 {
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new _Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              this.#pushHandlerSets(handlerSets, astNode, method, node.#params);
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          if (matcher instanceof RegExp) {
            if (partOffsets === null) {
              partOffsets = new Array(len);
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.substring(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (hasChildren(child.#children)) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
  const opts = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: [],
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    const allowOrigin = await findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.origin !== "*") {
        set("Vary", "Origin");
      }
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = await findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
    if (opts.origin !== "*") {
      c.header("Vary", "Origin", { append: true });
    }
  };
};

// src/SystemConfig.js
var SystemConfig = {
  corsSwitch: true,
  // 是否开启跨域
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  // 允许的请求方法
  file_upload_max_size: 100 * 1024 * 1024
  // 文件最大限制，单位：字节
};
var SystemConfig_default = SystemConfig;

// src/SystemConfigCF.js
var SystemConfigCF = {
  Worker: {
    request_max_count: 9e4
  },
  cloudflare_kv: {
    save_size: 1024 * 1024 * 1024 * 0.9,
    // 900MB
    read_max_count: 9e5,
    write_max_count: 9e6,
    delete_max_count: 9e6,
    list_max_count: 9e6
  },
  cloudflare_d1: {
    database_max_count: 3,
    database_save_size: 1024 * 1024 * 1024 * 9,
    // 9GB
    read_max_count: 4e7,
    write_max_count: 4e6
  },
  cloudflare_r2: {
    save_size: 9437184
  }
};
var SystemConfigCF_default = SystemConfigCF;

// src/utils/utils.js
var getType = (obj) => {
  return Object.prototype.toString.call(obj).slice(8, -1);
};
var ObjectType = {
  Object: "Object",
  Array: "Array",
  Date: "Date",
  RegExp: "RegExp",
  Function: "Function",
  Null: "Null",
  Undefined: "Undefined",
  Number: "Number",
  String: "String",
  Boolean: "Boolean"
};
function isValidValue(value) {
  if (value === null || value === void 0) {
    return false;
  }
  if (typeof value === "string" && value.trim() === "") {
    return false;
  }
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.keys(value).length !== 0;
  }
  if (typeof value === "number" && isNaN(value)) {
    return false;
  }
  return true;
}
async function md5(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("MD5", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function toMd5(input) {
  let buffer;
  if (input instanceof Blob) {
    buffer = await input.arrayBuffer();
  } else if (typeof input === "string") {
    buffer = new TextEncoder().encode(input);
  } else if (input instanceof ArrayBuffer) {
    buffer = input;
  } else if (input && input.buffer instanceof ArrayBuffer) {
    buffer = input.buffer;
  } else {
    buffer = new TextEncoder().encode(String(input));
  }
  const hashBuffer = await crypto.subtle.digest("MD5", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
function getCurrentDate(timestamp = Date.now(), format = "YYYY-MM-DD HH:mm:ss") {
  const now = new Date(timestamp);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  let formattedDate = format.replace("YYYY", year);
  formattedDate = formattedDate.replace("MM", month);
  formattedDate = formattedDate.replace("DD", day);
  formattedDate = formattedDate.replace("HH", hours);
  formattedDate = formattedDate.replace("mm", minutes);
  formattedDate = formattedDate.replace("ss", seconds);
  return formattedDate;
}
function getDatePrevious(timestamp = Date.now(), format = "1M") {
  const match2 = format.match(/^(\d+)([yMdHms])$/);
  if (!match2) {
    console.error("Invalid format string. Expected format: {number}{unit}, e.g., '1y', '3M', '7d'");
    return void 0;
  }
  const num = parseInt(match2[1], 10);
  const unit = match2[2];
  if (num < 1) {
    return void 0;
  }
  const now = new Date(timestamp);
  switch (unit) {
    case "y":
      now.setFullYear(now.getFullYear() - num);
      break;
    case "M":
      now.setMonth(now.getMonth() - num);
      break;
    case "d":
      now.setDate(now.getDate() - num);
      break;
    case "H":
      now.setHours(now.getHours() - num);
      break;
    case "m":
      now.setMinutes(now.getMinutes() - num);
      break;
    case "s":
      now.setSeconds(now.getSeconds() - num);
      break;
    default:
      console.error("Invalid time unit. Supported units: y(year), M(month), d(day), H(hour), m(minute), s(second)");
      return void 0;
  }
  return now.getTime();
}
function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// src/filterValidToken.js
function filterValidToken(c) {
  let userTokens = c.env.USER_TOKENS;
  if (getType(userTokens) !== ObjectType.String) {
    return false;
  }
  const userToken = getRequestHeaders(c)["token"];
  if (!isValidValue(userToken) || userTokens !== userToken) {
    return false;
  }
  return true;
}
function getRequestHeaders(c) {
  return c.req.header();
}

// src/handle/handleExtendRequestBodyParser.js
async function handleExtendRequestBodyParser(request) {
  const contentType = request.header("content-type") || "";
  let params = {};
  const urlParams = new URL(request.url).searchParams;
  urlParams.forEach((value, key) => {
    params[key] = value;
  });
  if (request.method !== "GET") {
    if (contentType.includes("application/json")) {
      const data = await request.json();
      if (data) {
        if (getType(data) === ObjectType.Array) {
          params = data;
        } else if (getType(data) === ObjectType.Object) {
          params = { ...params, ...data };
        }
      }
    } else if (contentType.includes("form-data")) {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        params[key] = value;
      }
    } else if (contentType.includes("x-www-form-urlencoded")) {
      const text = await request.text();
      new URLSearchParams(text).forEach((value, key) => {
        params[key] = value;
      });
    }
    request.__body = params;
  } else {
    request.__query = params;
  }
  return request;
}

// src/handle/handleExtendRequest.js
async function handleExtendRequest(c) {
  let request = c.request || c.req;
  request.headers = request.raw.headers;
  request = await handleExtendRequestBodyParser(request);
  const obj = { getValues, getValuesPage, getValueByIdToArray, getValueByIdToObject, getValueById };
  Object.keys(obj).forEach((key) => {
    request[key] = obj[key];
    c[key] = obj[key];
  });
  c.getValues = function() {
    return this.req.getValues();
  };
  return c;
}
function getValues() {
  console.log(`\u6536\u5230\u8BF7\u6C42\u6570\u636E\uFF0C\u65B9\u6CD5\uFF1A${this.method}\uFF0C\u5730\u5740\uFF1A${this.url}\uFF0C\u53C2\u6570\uFF1A`);
  console.log(this.method === "GET" ? this.__query : this.__body);
  return this.method === "GET" ? this.__query : this.__body;
}
function getValuesPage() {
  const values = this.getValues() || {};
  try {
    let { index, size } = values;
    index = Number(index);
    if (Number.isNaN(index)) {
      index = 1;
    }
    size = Number(size);
    if (Number.isNaN(size)) {
      size = 30;
    }
    values.pageIndex = index;
    values.pageSize = size;
    values.pageRowNum = (index - 1) * size;
  } catch (error) {
    throw error;
  }
  return values;
}
function getValueByIdToArray(keys, targetObj) {
  let obj = targetObj || this.getValues();
  const result = [];
  keys.map((item) => {
    result.push(obj[item]);
  });
  return result;
}
function getValueByIdToObject(keys, targetObj) {
  let obj = targetObj || this.getValues();
  const result = {};
  keys.map((item) => {
    result[item] = obj[item];
  });
  return result;
}
function getValueById(key) {
  return this.getValues()[key];
}

// src/handle/handleExtendResponse.js
function handleExtendBindMessage(c) {
  const obj = { sendSuccess, sendWarning, sendError };
  Object.keys(obj).forEach((key) => {
    c[key] = obj[key];
  });
  return c;
}
function sendSuccess(result) {
  let refResult = {
    status: 200,
    message: "success"
  };
  if (result instanceof Error) {
    return this.sendError(result);
  } else if (getType(result) === ObjectType.Object) {
    refResult = Object.assign(refResult, result);
  } else if (getType(result) === ObjectType.String) {
    refResult = Object.assign(refResult, {
      message: result
    });
  }
  return handleResponse(refResult, this);
}
function sendError(result) {
  let refResult = {
    status: 500,
    message: "error"
  };
  if (result instanceof Error) {
    refResult = Object.assign(refResult, {
      message: result.message || "error"
    });
  } else if (getType(result) === ObjectType.Object) {
    refResult = Object.assign(refResult, result);
  } else if (getType(result) === ObjectType.String) {
    refResult = Object.assign(refResult, {
      message: result
    });
  }
  return handleResponse(refResult, this);
}
function sendWarning(result) {
  let refResult = {
    status: 500,
    message: "warning"
  };
  if (result instanceof Error) {
    return this.sendError(result);
  } else if (getType(result) === ObjectType.Object) {
    refResult = Object.assign(refResult, result);
  } else if (getType(result) === ObjectType.String) {
    refResult = Object.assign(refResult, {
      message: result
    });
  }
  return handleResponse(refResult, this);
}
function handleResponse(result, c) {
  let text = null;
  try {
    text = JSON.stringify(result);
  } catch (error) {
    text = JSON.stringify({ status: 500, message: "JSON\u683C\u5F0F\u8F6C\u6362\u5931\u8D25" });
  }
  return new Response(text, {
    status: result.status || 200,
    headers: c.refHeaders || {
      "Content-Type": "application/json; charset=UTF-8"
    }
  });
}

// src/api/test/index.js
var router = new Hono2();
router.get("/", async (c) => {
  const { uuid } = c.getValues();
  return c.sendSuccess({ message: "Hello from test!", uuid });
});
var test_default = router;

// src/api/test/request.js
var router2 = new Hono2();
router2.get("/", async (c) => {
  const { uuid } = c.getValues();
  return c.sendSuccess({ message: "Hello from test!", uuid });
});
var request_default = router2;

// src/utils/db/ClassDBConnection.js
var { APP_DATABASE } = SystemConfig_default;
var ClassDBConnection = class {
  constructor() {
    this._isopen = false;
  }
  init(env) {
    this.env = env;
    this.DB = env.DB;
    this.__packSwitch = true;
  }
  // 设置控制台开关
  setPackSwitch(bool) {
    this.__packSwitch = bool;
  }
  connection() {
    try {
      this.__isopen = true;
      return true;
    } catch (error) {
      throw new Error(`\u6570\u636E\u5E93\u8FDE\u63A5\u5F02\u5E38\uFF1A${error.message}`);
    }
  }
  open() {
    if (this._isopen !== true) {
      return this.connection();
    }
    return false;
  }
  close() {
    try {
      this._isopen = false;
    } catch (e) {
    }
  }
  isOpen() {
    return this._isopen;
  }
  /**
   * 执行数据库命令
   * @param {*} sql       sql语句
   * @param {*} params    sql参数
   * @param {*} isPack    是否包装查询，默认为true
   * @returns 
   */
  query(sql, params, isPack = true) {
    if (isPack) {
      sql = this.packagingQueryBefore(sql);
    }
    console.log(`\u51C6\u5907\u6267\u884C\u7684sql\uFF1A`, sql);
    console.log(`\u51C6\u5907\u63D0\u4EA4\u7684\u53C2\u6570`, params);
    return new Promise((resolve, reject) => {
      this.DB.prepare(sql).bind(...params).run().then((result) => {
        resolve(result.results);
      }).catch((error) => {
        reject(error);
      });
    });
  }
  exec(sql) {
    console.log(`\u51C6\u5907\u6267\u884C\u7684sql\uFF1A`, sql);
    return new Promise((resolve, reject) => {
      try {
        const result = this.DB.exec(sql);
        resolve(result);
      } catch (error) {
        reject(new Error("\u6570\u636E\u5E93\u6267\u884C\u9519\u8BEF\uFF0C\u8BF7\u68C0\u67E5\u63D0\u4EA4\u53C2\u6570"));
      }
    });
  }
  // 在查询打包之前执行
  packagingQueryBefore(value) {
    if (!this.__packSwitch) {
      return value;
    }
    const newValue = value.replace(/^\s+/g, "");
    if (/^SELECT\b(?!\s+COUNT\b)/i.test(newValue)) {
      value = `
                    SELECT
                        result.id AS 'row_key',
                        result.*
                    FROM (
                            ${value}
                        ) AS result
                    `;
    }
    return value;
  }
  /**
   * 开启事务
   * @param {*} bool ，是否独占模式，默认false
   */
  transactionBegin(bool = false) {
    this.query(bool ? "BEGIN EXCLUSIVE TRANSACTION;" : "BEGIN;");
  }
  // 保存事务的回滚点
  transactionSavePoint(name) {
    this.query(`SAVEPOINT ${name}`);
  }
  // 回滚到事务的回滚点
  transactionRollbackToSavePoint(name) {
    this.query(`ROLLBACK TO SAVEPOINT ${name}`);
  }
  // 提交事务
  transactionCommit() {
    this.query("commit");
  }
  // 回滚事务
  transactionRollback() {
    this.query("ROLLBACK");
  }
  /**
   * 导出数据库为sql
   */
  async exportSql() {
    console.log("--- Cloudflare D1 SQL \u5BFC\u51FA\u5F00\u59CB ---");
    const db = this.DB;
    if (!db) {
      console.error("\u9519\u8BEF: \u6570\u636E\u5E93\u7ED1\u5B9A\u672A\u63D0\u4F9B\u3002");
      throw new Error("\u6570\u636E\u5E93\u7ED1\u5B9A\u672A\u63D0\u4F9B\u3002");
    }
    let sql = "";
    sql += "PRAGMA foreign_keys = OFF;\n";
    sql += "BEGIN TRANSACTION;\n\n";
    try {
      const tablesResult = await db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'tb_%'"
      ).all();
      const tableNames = tablesResult.results.map((t) => t.name);
      if (tableNames.length === 0) {
        console.warn("\u672A\u627E\u5230\u4EFB\u4F55\u7528\u6237\u5B9A\u4E49\u7684\u8868\u3002");
        return sql + "COMMIT;\nPRAGMA foreign_keys = ON;\n";
      }
      console.log("\u627E\u5230\u4EE5\u4E0B\u8868:", tableNames.join(", "));
      for (const tableName4 of tableNames) {
        console.log(`--- \u5904\u7406\u8868: ${tableName4} ---`);
        sql += `--
-- Table: ${tableName4}
--
`;
        const schemaResult = await db.prepare(
          "SELECT sql FROM sqlite_master WHERE name=?"
        ).bind(tableName4).first();
        if (schemaResult && schemaResult.sql) {
          sql += schemaResult.sql + ";\n";
          console.log(`\u5DF2\u6DFB\u52A0\u8868 ${tableName4} \u7684\u7ED3\u6784\u3002`);
        } else {
          console.warn(`\u8B66\u544A: \u672A\u80FD\u83B7\u53D6\u8868 ${tableName4} \u7684\u7ED3\u6784 (CREATE TABLE \u8BED\u53E5)\u3002`);
          continue;
        }
        const rowsResult = await db.prepare(
          `SELECT * FROM ${tableName4}`
        ).all();
        const rows = rowsResult.results;
        if (rows && rows.length > 0) {
          console.log(`\u627E\u5230 ${rows.length} \u6761\u6570\u636E\u7528\u4E8E\u8868 ${tableName4}\u3002`);
          for (const row of rows) {
            const columnNames = Object.keys(row).map((col) => `\`${col}\``).join(", ");
            const values = Object.values(row).map((v) => {
              if (typeof v === "string") {
                return `'${v.replace(/'/g, "''")}'`;
              } else if (v === null || v === void 0) {
                return "NULL";
              } else if (typeof v === "boolean") {
                return v ? 1 : 0;
              }
              return v;
            }).join(", ");
            sql += `INSERT INTO \`${tableName4}\` (${columnNames}) VALUES (${values});
`;
          }
          console.log(`\u5DF2\u6DFB\u52A0\u8868 ${tableName4} \u7684\u6570\u636E\u3002`);
        } else {
          console.log(`\u8868 ${tableName4} \u6CA1\u6709\u6570\u636E\u3002`);
        }
        sql += "\n";
      }
    } catch (error) {
      console.error("\u5728\u5BFC\u51FAD1 SQL\u8FC7\u7A0B\u4E2D\u53D1\u751F\u9519\u8BEF:", error);
      sql = "ROLLBACK;\n";
      throw error;
    }
    sql += "COMMIT;\n";
    sql += "PRAGMA foreign_keys = ON;\n";
    console.log("--- Cloudflare D1 SQL \u5BFC\u51FA\u5B8C\u6210 ---");
    return sql;
  }
};
var ClassDBConnection_default = ClassDBConnection;

// src/api/user.accountVerification.js
var { file_upload_max_size } = SystemConfig_default;
var tableName = "tb_admin";
var router3 = new Hono2();
router3.post("/accountVerification", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  let sqlFields = [], sqlParams, sqlWhere = "where 1=1", sqlSpace, sqlValue;
  try {
    sqlFields = ["username", "password"];
    const { username, password } = c.getValues();
    const hashedPassword = await md5(password);
    sqlParams = [username, hashedPassword];
    sqlFields.map((item) => {
      sqlWhere += ` and d.${item}=? `;
    });
    sqlParams = sqlParams.filter((item) => {
      return item != null;
    });
    if (sqlParams.length < 2) {
      return c.sendError("\u53C2\u6570\u7F3A\u5931\u6216\u4E0D\u662F\u6709\u6548\u53C2\u6570");
    }
    sqlValue = `
            SELECT
                d.id,
                d.username,
                '${c.env.USER_TOKENS}' AS token,
                CAST(${file_upload_max_size} AS NUMERIC) AS file_upload_max_size
            FROM
                ${tableName} AS d
                ${sqlWhere}
            `;
    classDBConnection.open();
    let result = await classDBConnection.query(sqlValue, sqlParams);
    classDBConnection.close();
    if (result.length < 1) {
      return c.sendError("\u8D26\u6237\u6216\u5BC6\u7801\u4E0D\u6B63\u786E\uFF0C\u9A8C\u8BC1\u5931\u8D25");
    }
    return c.sendSuccess({ result: result[0] });
  } catch (error) {
    classDBConnection.close();
    return c.sendError(error);
  }
});
var user_accountVerification_default = router3;

// src/api/admin/admin.config.js
var conf_uuidName = "id";
var conf_tableName = "tb_admin";
var conf_tableColumns = [
  "username",
  "password"
];

// src/api/admin/admin.js
var uuidName = conf_uuidName;
var tableName2 = conf_tableName;
var tableColumns = conf_tableColumns;
var router4 = new Hono2();
router4.get("/", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  let sqlFields = [], sqlParams = [], sqlWhere = "where 1=1", sqlSpace, sqlValue;
  try {
    const { uuid } = c.getValues();
    sqlFields = [uuidName];
    let { pageSize, pageRowNum, pageIndex } = c.getValuesPage();
    sqlFields.map((item) => {
      const value = c.getValueById(item);
      if (isValidValue(value)) {
        sqlWhere += ` and d.${item}=? `;
        sqlParams.push(value);
      }
    });
    let sqlValue2 = `
                    SELECT
                        d.*
                    FROM
                        ${tableName2} AS d
                        ${sqlWhere} 
                        order by d.${uuidName} desc limit ? offset ?
                    `;
    classDBConnection.open();
    let result = await classDBConnection.query(sqlValue2, [...sqlParams, pageSize, pageRowNum]);
    result.map((item) => {
      item.create_time = getCurrentDate(item.create_time);
    });
    const pageResult = await classDBConnection.query(`select count(d.id) as total from ${tableName2} as d ${sqlWhere}`, sqlParams);
    const page = {
      total: pageResult[0]["total"],
      pageSize,
      pageIndex
    };
    classDBConnection.close();
    return c.sendSuccess({
      message: "success",
      result,
      page
    });
  } catch (error) {
    classDBConnection.close();
    return c.sendError(error);
  }
});
router4.post("/", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  let sqlFields = tableColumns, sqlParams, sqlWhere = "where 1=1", sqlSpace, sqlValue;
  try {
    const { username, password } = c.getValues();
    const hashedPassword = await md5(password);
    sqlParams = [username, hashedPassword];
    sqlValue = `
                    insert into ${tableName2}
                        (${sqlFields.join(",")},create_time)
                    values
                        (${sqlFields.map((item) => {
      return "?";
    }).join(",")},${Date.now()})
                    `;
    await classDBConnection.query(sqlValue, sqlParams);
    classDBConnection.close();
    return c.sendSuccess();
  } catch (error) {
    classDBConnection.close();
    return c.sendError(error);
  }
});
router4.put("/", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  let sqlFields = tableColumns, sqlParams, sqlWhere = "where 1=1", sqlSpace, sqlValue;
  try {
    const uuid = c.getValueById(uuidName);
    const { username, password } = c.getValues();
    if (isValidValue(password)) {
      const hashedPassword = await md5(password);
      sqlParams = [username, hashedPassword];
    } else {
      sqlFields = ["username"];
      sqlParams = [username];
    }
    sqlParams.push(uuid);
    sqlSpace = sqlFields.map((item) => {
      return `${item}=?`;
    }).join(",");
    sqlWhere += ` and ${uuidName}=? `;
    sqlValue = `update ${tableName2} set ${sqlSpace} ${sqlWhere}`;
    classDBConnection.open();
    await classDBConnection.query(sqlValue, sqlParams);
    classDBConnection.close();
    return c.sendSuccess({ message: "success" });
  } catch (error) {
    classDBConnection.close();
    return c.sendError(error);
  }
});
router4.delete("/", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  let sqlFields = tableColumns, sqlParams, sqlWhere = "where 1=1", sqlValue;
  try {
    const uuid = c.getValueById(uuidName);
    sqlFields = [uuidName];
    sqlParams = c.getValueByIdToArray(sqlFields);
    sqlFields.map((item) => {
      sqlWhere += ` and ${item}=? `;
    });
    sqlValue = `delete from ${tableName2} ${sqlWhere}`;
    classDBConnection.open();
    await classDBConnection.query(sqlValue, sqlParams);
    classDBConnection.close();
    return c.sendSuccess();
  } catch (error) {
    classDBConnection.close();
    return c.sendError(error);
  }
});
router4.delete("/multiple", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  let sqlFields = tableColumns, sqlParams, sqlWhere = "where 1=1", sqlValue;
  try {
    sqlFields = [];
    sqlParams = c.getValues();
    if (getType(sqlParams) !== "Array") {
      throw new Error("\u53C2\u6570\u9519\u8BEF");
    }
    classDBConnection.open();
    for await (const element of sqlParams) {
      sqlWhere = ` where 1=1 and ${uuidName}=? `;
      sqlValue = `delete from ${tableName2} ${sqlWhere}`;
      await classDBConnection.query(sqlValue, [element]);
    }
    classDBConnection.close();
    return c.sendSuccess();
  } catch (error) {
    classDBConnection.close();
    return c.sendError(error);
  }
});
var admin_default = router4;

// src/api/admin/database.config.js
var conf_uuidName2 = "id";
var conf_tableName2 = "tb_database_backup";
var conf_tableColumns2 = [
  "name",
  "size",
  "path",
  "md5"
];
var database_config_default = {
  conf_uuidName: conf_uuidName2,
  conf_tableName: conf_tableName2,
  conf_tableColumns: conf_tableColumns2
};

// src/utils/cloudflare/bucket_database.js
async function putObject(env, file, filename) {
  const objectKey = filename;
  if (!objectKey) {
    throw new Error("\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570");
  }
  try {
    await env.MY_BUCKET_DATABASE.put(objectKey, file, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=3600"
      }
    });
  } catch (error) {
    throw error;
  }
}
async function deleteObject(env, filename) {
  const objectKey = filename;
  if (!objectKey) {
    throw new Error("\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570");
  }
  try {
    await env.MY_BUCKET_DATABASE.delete(objectKey);
  } catch (error) {
  }
}

// src/api/admin/databaseHandle.js
async function handleGet(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8, conf_tableColumns: conf_tableColumns8 } = database_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = conf_tableColumns8, sqlParams = [], sqlWhere = "WHERE 1=1", sqlValue, sqlColumnsFilters = ["tempfilter"];
  try {
    let { pageSize, pageRowNum, pageIndex } = c.getValuesPage();
    sqlFields = [uuidName3, "searchText"];
    sqlFields.map((item) => {
      const value = c.getValueById(item);
      if (isValidValue(value)) {
        switch (item) {
          case "searchText":
            sqlWhere += ` and d.name like ? `;
            sqlParams.push(`%${value}%`);
          default:
            sqlWhere += ` and d.${item}=? `;
            sqlParams.push(value);
            break;
        }
      }
    });
    let sqlValue2 = `
                        SELECT
                            d.${uuidName3},d.${conf_tableColumns8.filter((item) => !sqlColumnsFilters.includes(item)).join(",d.")},d.create_time
                        FROM
                            ${tableName4} AS d
                            ${sqlWhere} 
                        ORDER BY d.${uuidName3} DESC LIMIT ? OFFSET ?
                        `;
    classDBConnection.open();
    let result = await classDBConnection.query(sqlValue2, [...sqlParams, pageSize, pageRowNum]);
    result.map((item) => {
      item.create_time = getCurrentDate(item.create_time, "YYYY-MM-DD HH:mm:ss");
    });
    const pageResult = await classDBConnection.query(`SELECT COUNT(d.${uuidName3}) AS total FROM ${tableName4} AS d ${sqlWhere}`, sqlParams);
    const page = {
      total: pageResult[0]["total"],
      pageSize,
      pageIndex
    };
    return {
      result,
      page
    };
  } catch (error) {
    throw error;
  }
}
async function handlePost(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8, conf_tableColumns: conf_tableColumns8 } = database_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = conf_tableColumns8, sqlParams, sqlValue;
  try {
    let sqlText = await classDBConnection.exportSql();
    const filename = `${getCurrentDate(Date.now(), "YYYYMMDDHHmmss")}`;
    const file = new Blob([sqlText], {
      type: "application/sql",
      lastModified: Date.now()
    });
    const md52 = await toMd5(file);
    sqlValue = `
                    SELECT
                        d.md5
                    FROM
                        ${tableName4} AS d
                    WHERE
                        d.md5 = ?
                    `;
    let result = await classDBConnection.query(sqlValue, [md52], false);
    if (result.length > 0) {
      throw new Error("\u6570\u636E\u5E93\u5907\u4EFD\u6587\u4EF6\u5DF2\u5B58\u5728");
    }
    await putObject(c.env, file, md52);
    sqlParams = [filename, formatFileSize(file.size), `/${md52}`, md52];
    sqlValue = `
                    insert into ${tableName4}
                        (${sqlFields.join(",")},create_time)
                    values
                        (${sqlFields.map((item) => {
      return "?";
    }).join(",")},${Date.now()})
                    `;
    await classDBConnection.query(sqlValue, sqlParams);
  } catch (error) {
    throw error;
  }
}
async function handlePostVacuum(c, classDBConnection) {
  let sqlParams = [], sqlValue;
  try {
    try {
      await classDBConnection.exec("COMMIT;");
      console.log("\u5C1D\u8BD5\u63D0\u4EA4\u4E4B\u524D\u53EF\u80FD\u672A\u63D0\u4EA4\u7684\u4E8B\u52A1.");
    } catch (commitError) {
      if (!commitError.message.includes("no transaction is active")) {
        console.warn("\u5C1D\u8BD5\u63D0\u4EA4\u4E8B\u52A1\u65F6\u9047\u5230\u5176\u4ED6\u9519\u8BEF:", commitError.message);
      }
    }
    sqlValue = `VACUUM;`;
    await classDBConnection.exec(sqlValue);
  } catch (error) {
    throw error;
  }
}
async function handleDelete(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8 } = database_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = [], sqlParams, sqlWhere = "WHERE 1=1", sqlValue;
  try {
    sqlFields = [uuidName3];
    sqlParams = c.getValueByIdToArray(sqlFields);
    sqlValue = `
                SELECT
                    d.${uuidName3},d.md5
                FROM
                    ${tableName4} AS d
                    ${sqlWhere} 
                `;
    classDBConnection.open();
    let result = await classDBConnection.query(sqlValue, [...sqlParams]);
    if (result.length === 0) {
      throw new Error("\u6570\u636E\u4E0D\u5B58\u5728");
    }
    const filename = result[0]["md5"];
    await deleteObject(c.env, filename);
    sqlWhere = ` where 1=1 `;
    sqlFields = [uuidName3];
    sqlParams = c.getValueByIdToArray(sqlFields);
    sqlFields.map((item) => {
      sqlWhere += ` AND ${item}=? `;
    });
    sqlValue = `delete from ${tableName4} ${sqlWhere}`;
    await classDBConnection.query(sqlValue, sqlParams);
  } catch (error) {
    throw error;
  }
}
async function handleDeleteMultiple(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8 } = database_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = [], sqlParams, sqlWhere = "where 1=1", sqlValue;
  try {
    sqlFields = [];
    sqlParams = c.getValues();
    if (getType(sqlParams) !== "Array") {
      throw new Error("\u53C2\u6570\u9519\u8BEF");
    }
    for await (const element of sqlParams) {
      sqlWhere = ` where ${uuidName3}=? `;
      sqlValue = `
                SELECT
                    d.${uuidName3},d.md5
                FROM
                    ${tableName4} AS d
                    ${sqlWhere} 
                `;
      let result = await classDBConnection.query(sqlValue, [element]);
      if (result.length === 0) {
        continue;
      }
      const filename = result[0]["md5"];
      await deleteObject(c.env, filename);
      sqlWhere = ` where ${uuidName3}=? `;
      sqlValue = `delete from ${tableName4} ${sqlWhere}`;
      await classDBConnection.query(sqlValue, [element]);
    }
  } catch (error) {
    throw error;
  }
}

// src/api/admin/database.js
var router5 = new Hono2();
router5.get("/", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  classDBConnection.open();
  try {
    const result = await handleGet(c, classDBConnection);
    classDBConnection.close();
    return c.sendSuccess(result);
  } catch (error) {
    classDBConnection.close();
    throw error;
  }
});
router5.post("/", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  classDBConnection.open();
  try {
    await handlePost(c, classDBConnection);
    classDBConnection.close();
    return c.sendSuccess();
  } catch (error) {
    classDBConnection.close();
    return c.sendError(error);
  }
});
router5.post("/Vacuum", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  classDBConnection.open();
  try {
    await handlePostVacuum(c, classDBConnection);
    classDBConnection.close();
    return c.sendSuccess();
  } catch (error) {
    classDBConnection.close();
    return c.sendError(error);
  }
});
router5.delete("/", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  classDBConnection.open();
  try {
    await handleDelete(c, classDBConnection);
    classDBConnection.close();
    return c.sendSuccess();
  } catch (error) {
    classDBConnection.close();
    throw error;
  }
});
router5.delete("/multiple", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  classDBConnection.open();
  try {
    await handleDeleteMultiple(c, classDBConnection);
    classDBConnection.close();
    return c.sendSuccess();
  } catch (error) {
    classDBConnection.close();
    throw error;
  }
});
var database_default = router5;

// src/api/admin/blogClass.config.js
var conf_uuidName3 = "id";
var conf_tableName3 = "tb_blog_class";
var conf_tableColumns3 = [
  "name",
  "sort"
];
var blogClass_config_default = {
  conf_uuidName: conf_uuidName3,
  conf_tableName: conf_tableName3,
  conf_tableColumns: conf_tableColumns3
};

// src/api/admin/blogs.config.js
var conf_uuidName4 = "id";
var conf_tableName4 = "tb_blogs";
var conf_tableColumns4 = [
  "title",
  "titleDecodeValue",
  "tags",
  "jianshu",
  "content",
  "classId",
  "key",
  "readTop",
  "readCount"
];
var blogs_config_default = {
  conf_uuidName: conf_uuidName4,
  conf_tableName: conf_tableName4,
  conf_tableColumns: conf_tableColumns4
};

// src/api/admin/notepad.config.js
var conf_uuidName5 = "id";
var conf_tableName5 = "tb_notepad";
var conf_tableColumns5 = [
  "contentDecodeValue",
  "content",
  "key"
];
var notepad_config_default = {
  conf_uuidName: conf_uuidName5,
  conf_tableName: conf_tableName5,
  conf_tableColumns: conf_tableColumns5
};

// src/api/admin/link.config.js
var conf_uuidName6 = "id";
var conf_tableName6 = "tb_friendly_link";
var conf_tableColumns6 = [
  "name",
  "target",
  "link_url",
  "sort"
];
var link_config_default = {
  conf_uuidName: conf_uuidName6,
  conf_tableName: conf_tableName6,
  conf_tableColumns: conf_tableColumns6
};

// src/api/admin/pageWelcomeHandle.js
async function handleBlogClassTotal(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8 } = blogClass_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = [], sqlParams = [], sqlValue;
  try {
    sqlValue = `
                SELECT
                    count(d.${uuidName3}) AS total
                FROM
                    ${tableName4} AS d
                `;
    const result = await classDBConnection.query(sqlValue, [...sqlParams]);
    return result[0]["total"];
  } catch (error) {
    throw error;
  }
}
async function handleBlogTotal(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8 } = blogs_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = [], sqlParams = [], sqlValue;
  try {
    sqlValue = `
                SELECT
                    count(d.${uuidName3}) AS total
                FROM
                    ${tableName4} AS d
                `;
    const result = await classDBConnection.query(sqlValue, [...sqlParams]);
    return result[0]["total"];
  } catch (error) {
    throw error;
  }
}
async function handleNotepadTotal(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8 } = notepad_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = [], sqlParams = [], sqlValue;
  try {
    sqlValue = `
                SELECT
                    count(d.${uuidName3}) AS total
                FROM
                    ${tableName4} AS d
                `;
    const result = await classDBConnection.query(sqlValue, [...sqlParams]);
    return result[0]["total"];
  } catch (error) {
    throw error;
  }
}
async function handleLinkTotal(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8 } = link_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = [], sqlParams = [], sqlValue;
  try {
    sqlValue = `
                SELECT
                    count(d.${uuidName3}) AS total
                FROM
                    ${tableName4} AS d
                `;
    const result = await classDBConnection.query(sqlValue, [...sqlParams]);
    return result[0]["total"];
  } catch (error) {
    throw error;
  }
}
async function handleBlogAddDateCount(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8 } = blogs_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = [], sqlParams = [], sqlWhere = "WHERE 1=1", sqlValue;
  try {
    const endDate = Date.now();
    const startDate = getDatePrevious(endDate, "1y");
    sqlParams = [startDate, endDate];
    sqlValue = `
                SELECT 
                    strftime('%Y-%m', datetime(create_time / 1000, 'unixepoch', 'localtime')) AS publish_date,
                    COUNT(id) AS publish_count
                FROM ${tableName4} 
                WHERE 
                    create_time >= ?
                    AND create_time <= ?
                GROUP BY strftime('%Y-%m', datetime(create_time / 1000, 'unixepoch', 'localtime'))
                ORDER BY publish_date;
                `;
    const result = await classDBConnection.query(sqlValue, sqlParams, false);
    return result;
  } catch (error) {
    throw error;
  }
}
async function handleBlogClassCount(c, classDBConnection) {
  const { conf_uuidName: conf_uuidName8, conf_tableName: conf_tableName8 } = link_config_default;
  const uuidName3 = conf_uuidName8;
  const tableName4 = conf_tableName8;
  let sqlFields = [], sqlParams = [], sqlWhere = "WHERE 1=1", sqlValue;
  try {
    const endDate = Date.now();
    const startDate = getDatePrevious(endDate, "1M");
    sqlParams = [];
    sqlValue = `
                SELECT 
                    bc.id AS class_id,
                    bc.name AS class_name,
                    COUNT(b.id) AS blog_count
                FROM tb_blog_class bc
                    INNER JOIN tb_blogs b ON bc.id = b.classId
                GROUP BY bc.id, bc.name
                ORDER BY blog_count DESC, bc.name;
                `;
    const result = await classDBConnection.query(sqlValue, [], false);
    return result;
  } catch (error) {
    throw error;
  }
}

// src/api/admin/pageWelcome.js
var router6 = new Hono2();
router6.get("/", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  let result;
  try {
    classDBConnection.open();
    const blogClassTotal = await handleBlogClassTotal(c, classDBConnection);
    const blogTotal = await handleBlogTotal(c, classDBConnection);
    const notepadTotal = await handleNotepadTotal(c, classDBConnection);
    const linkTotal = await handleLinkTotal(c, classDBConnection);
    const blogAddDateCount = await handleBlogAddDateCount(c, classDBConnection);
    const blogClassCount = await handleBlogClassCount(c, classDBConnection);
    result = {
      blogClassTotal,
      blogTotal,
      notepadTotal,
      linkTotal,
      blogAddDateCount,
      blogClassCount
    };
    classDBConnection.close();
    return c.sendSuccess(result);
  } catch (error) {
    classDBConnection.close();
    throw error;
  }
});
var pageWelcome_default = router6;

// src/api/admin/books.config.js
var conf_uuidName7 = "id";
var conf_tableName7 = "tb_books";

// src/api/app/books.query.js
var uuidName2 = conf_uuidName7;
var tableName3 = conf_tableName7;
var router7 = new Hono2();
router7.get("/list", async (c) => {
  const classDBConnection = new ClassDBConnection_default();
  classDBConnection.init(c.env);
  let sqlFields = [], sqlParams = [], sqlWhere = "where 1=1", sqlSpace, sqlValue;
  try {
    let { pageSize, pageRowNum, pageIndex } = c.getValuesPage();
    sqlFields = ["searchText"];
    sqlFields.map((item) => {
      const value = c.getValueById(item);
      if (isValidValue(value)) {
        if (item === "searchText") {
          sqlWhere += ` and (d.author like ? or d.title like ?) `;
          sqlParams.push(`%${value}%`);
          sqlParams.push(`%${value}%`);
        } else {
          sqlWhere += ` and d.${item}=? `;
          sqlParams.push(value);
        }
      }
    });
    sqlValue = `
                    SELECT
                        ROW_NUMBER() OVER(ORDER BY id DESC) AS row_num,
                        d.*
                    FROM
                        ${tableName3} AS d
                        ${sqlWhere} 
                    ORDER BY d.id desc LIMIT ? OFFSET ?
                    `;
    classDBConnection.open();
    let result = await classDBConnection.query(sqlValue, [...sqlParams, pageSize, pageRowNum]);
    const pageResult = await classDBConnection.query(`SELECT COUNT(d.${uuidName2}) AS total FROM ${tableName3} AS d ${sqlWhere}`, sqlParams);
    const page = {
      total: pageResult[0]["total"],
      pageSize,
      pageIndex
    };
    classDBConnection.close();
    return c.sendSuccess({
      message: "success",
      result,
      page
    });
  } catch (error) {
    classDBConnection.close();
    return c.sendError(error);
  }
});
router7.get("/detail", async (c) => {
  try {
    let result = { url: c.env.BOOKS_URL };
    return c.sendSuccess({
      message: "success",
      result
    });
  } catch (error) {
    return c.sendError(error);
  }
});
var books_query_default = router7;

// src/filterRouterIndex.js
var routerIndex = {
  "/api/test/index": test_default,
  "/api/test/request": request_default,
  "/api/user": user_accountVerification_default,
  "/api/admin": admin_default,
  "/api/admin/database": database_default,
  "/api/admin/welcome": pageWelcome_default,
  "/api/app/books": books_query_default
};

// src/handle/handleExtendRouter.js
async function handleExtendRouter(app2) {
  app2.get("/", (c) => {
    return c.sendSuccess({ message: "Hello, World!" });
  });
  Object.keys(routerIndex).forEach((key) => {
    const route = routerIndex[key];
    app2.route(key, route);
    app2.route(handleRouteSlash(key), route);
    handleRouteChildrenReg(key, route);
  });
  function handleRouteSlash(path) {
    let refPath = path.toString();
    if (!refPath.endsWith("/")) {
      return `${refPath}/`;
    } else {
      refPath = refPath.replace(/\/+$/, "");
    }
    return refPath;
  }
  function handleRouteChildrenReg(path, route) {
    const childrens = route.routes || [];
    if (childrens) {
      childrens.forEach((children) => {
        if (children.path.toString().length <= 1) {
          return;
        }
        const newKey = `${path.replace(/\/+$/, "")}${handleRouteSlash(children.path)}`;
        app2[children.method.toLowerCase()](newKey, children.handler);
      });
    }
  }
}
var handleExtendRouter_default = handleExtendRouter;

// src/filterGateway.js
async function filterGateway(app2) {
  const refHeaders = {
    "Content-Type": "application/json; charset=UTF-8",
    "test-date": Date.now().toString()
  };
  app2.use("*", async (c, next) => {
    console.log(`\u8FDB\u5165\u7F51\u5173\u8FC7\u6EE4\u5668\uFF1A[${(/* @__PURE__ */ new Date()).toISOString()}] ${c.req.method} ${c.req.path}`);
    c.refHeaders = refHeaders;
    handleExtendBindMessage(c);
    const url = new URL(c.req.url);
    const { pathname } = url;
    const cf_config = SystemConfigCF_default;
    if (pathname.startsWith("/api/admin")) {
      const isPass = filterValidToken(c);
      if (!isPass) {
        return c.sendError({
          message: `\u8BF7\u6C42\u88AB\u62D2\u7EDD\uFF0C\u6388\u6743\u9A8C\u8BC1\u672A\u901A\u8FC7\u3002`,
          status: 401
        });
      }
    }
    await handleExtendRequest(c);
    await next();
    if (!c.res) {
      return new Response(JSON.stringify({
        message: `is not send response`,
        status: 500
      }), {
        status: 500,
        headers: refHeaders
      });
    }
  });
  await handleExtendRouter_default(app2);
  app2.onError((err, c) => {
    console.error(`\u7F51\u5173\u62E6\u622A\u5668\u62A5\u9519`, err);
    return new Response(JSON.stringify({ message: "Server Error", status: 500 }), {
      status: 500,
      headers: c.refHeaders
    });
  });
  app2.notFound((c) => {
    return c.sendError({ message: "Not Found", status: 404 });
  });
}
var filterGateway_default = filterGateway;

// src/index.js
var { corsSwitch } = SystemConfig_default;
var app = new Hono2();
if (corsSwitch) {
  app.use("*", cors({ origin: "*" }));
}
await filterGateway_default(app);
var index_default = app;
export {
  index_default as default
};
