import { ServerRequest } from 'worktop/request'
import { ServerResponse } from 'worktop/response'
import { randomBytes } from 'crypto'

globalThis.crypto = {
  // @ts-ignore
  getRandomValues(arr: Uint8Array) {
    return randomBytes(arr.length)
  },
}

globalThis.Date.now = () => 1618948427027

// @ts-ignore - just for instanceof check
globalThis.ReadableStream = class ReadableStream {}

export const Namespace = () => ({} as any)
export const Mock = (x?: any) => {
  let args: any[],
    f = (...y: any[]) => ((args = y), Promise.resolve(x))
  // @ts-ignore
  return (f.args = () => args), f
}

export const Headers = () => {
  let raw = new Map()
  let set = raw.set.bind(raw)
  // @ts-ignore - mutating
  raw.set = (k, v) => set(k, String(v))
  // @ts-ignore - mutating
  raw.append = (k, v) => {
    let val = raw.get(k) || ''
    if (val) val += ', '
    val += String(v)
    set(k, val)
  }
  // @ts-ignore - ctor
  return raw as Headers
}

export const Response = () => {
  let headers = Headers()
  let body: any,
    finished = false,
    statusCode = 0
  // @ts-ignore
  return {
    headers,
    finished,
    get statusCode() {
      return statusCode
    },
    setHeader: headers.set,
    get body() {
      return body
    },
    send: (code, payload) => {
      statusCode = code
      body = payload
    },
    end(val: any) {
      finished = true
      body = val
    },
  } as ServerResponse
}

export const Request = (
  method = 'GET',
  queryString = '',
  payload: object | null = null,
): ServerRequest => {
  let headers = Headers()
  let query = new URLSearchParams(queryString)
  return {
    method,
    headers,
    query,
    body() {
      return Promise.resolve(payload)
    },
  } as ServerRequest
}

export const NewNamespace = (
  bindingConfig: { name: string },
  store: { key: string; value: any }[],
) => {
  let binding = Namespace()
  binding.get = (key: string, format: string) => {
    const m = store.findIndex((i) => i.key === `${key}`)
    if (m !== -1) {
      return Promise.resolve(
        format === 'json' ? JSON.parse(store[m].value) : store[m].value,
      )
    }
    return Promise.resolve(null)
  }
  binding.put = (key: string, value: any) => {
    store.unshift({ key, value })
    return Promise.resolve()
  }
  // @ts-ignore
  globalThis[bindingConfig.name] = binding

  return store
}
