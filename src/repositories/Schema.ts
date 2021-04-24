import * as DB from 'worktop/kv'
import fnv1a from '@sindresorhus/fnv1a'
import type { KV } from 'worktop/kv'
import { sort } from 'fast-sort'
import { ulid } from 'worktop/utils'

// cloudflare global kv binding
declare const SERVICES: KV.Namespace

export interface Schema {
  uid: string
  service_id: string
  is_active: boolean
  hash: string
  type_defs: string
  updated_at: number | null
  created_at: number
}

export interface SchemaIndex {
  uid: string
  service_id: string
  hash: string
}

export type NewSchema = Omit<
  Schema,
  'created_at' | 'updated_at' | 'uid' | 'hash'
>

export const key_owner = () => `schemas`
export const key_item = (uid: string) => `schemas::${uid}`

export function find(uid: string) {
  const key = key_item(uid)
  return DB.read<Schema>(SERVICES, key, 'json')
}

export async function findByHash(hash: string) {
  const all = await list()
  return all.find((s) => s.hash === hash)
}

export async function list(): Promise<SchemaIndex[]> {
  const key = key_owner()
  return (await DB.read<SchemaIndex[]>(SERVICES, key, 'json')) || []
}

export function syncIndex(versions: SchemaIndex[]) {
  const key = key_owner()
  return DB.write(SERVICES, key, versions)
}

export function remove(uid: string) {
  const key = key_item(uid)
  return DB.read<Schema>(SERVICES, key, 'json')
}

export function save(item: Schema) {
  const key = key_item(item.uid)
  return DB.write(SERVICES, key, item)
}

export async function insert(schema: NewSchema) {
  const values: Schema = {
    uid: ulid(),
    hash: fnv1a(schema.type_defs).toString(),
    service_id: schema.service_id,
    is_active: schema.is_active,
    type_defs: schema.type_defs,
    created_at: Date.now(),
    updated_at: null,
  }

  if (!(await save(values))) {
    return false
  }

  let allSchemas = (await list()).concat({
    uid: values.uid,
    service_id: values.service_id,
    hash: values.hash,
  })

  const sorted = sort(allSchemas).desc((u) => u.uid)

  if (!(await syncIndex(sorted))) {
    return false
  }

  return values
}
