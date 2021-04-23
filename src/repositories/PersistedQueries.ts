import * as DB from 'worktop/kv'
import type { KV } from 'worktop/kv'

// cloudflare global kv binding
declare const PERSISTED_QUERIES: KV.Namespace

export interface PersistedQuery {
  query: string
}

export const key_item = (uid: string) => `pq::${uid}`

export function find(uid: string) {
  const key = key_item(uid)
  return DB.read<PersistedQuery>(PERSISTED_QUERIES, key, 'text')
}

export function remove(pqKey: string) {
  const key = key_item(pqKey)
  return DB.remove(PERSISTED_QUERIES, key)
}

export function save(pqKey: string, query: string) {
  const key = key_item(pqKey)
  return DB.write(PERSISTED_QUERIES, key, query, false)
}
