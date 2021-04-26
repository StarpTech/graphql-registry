import * as DB from 'worktop/kv'
import fnv1a from '@sindresorhus/fnv1a'
import type { KV } from 'worktop/kv'
import { sort } from 'fast-sort'
import { ulid } from 'worktop/utils'

// cloudflare global kv binding
declare const SCHEMAS: KV.Namespace

export interface Schema {
  uid: string
  graph_name: string
  service_name: string
  is_active: boolean
  hash: string
  type_defs: string
  updated_at: number | null
  created_at: number
}

export interface SchemaIndex {
  uid: string
  service_name: string
  graph_name: string
  hash: string
}

export type NewSchema = Omit<
  Schema,
  'created_at' | 'updated_at' | 'uid' | 'hash'
>

export const key_owner = (graphName: string, serviceName: string) =>
  `graphs::${graphName}::${serviceName}::schemas`
export const key_item = (graphName: string, serviceName: string, uid: string) =>
  `graphs::${graphName}::${serviceName}::schemas::${uid}`

export function find(graphName: string, serviceName: string, uid: string) {
  const key = key_item(graphName, serviceName, uid)
  return DB.read<Schema>(SCHEMAS, key, 'json')
}

export async function findByHash(
  graphName: string,
  serviceName: string,
  hash: string,
) {
  const all = await list(graphName, serviceName)
  return all.find((s) => s.hash === hash)
}

export async function list(
  graphName: string,
  serviceName: string,
): Promise<SchemaIndex[]> {
  const key = key_owner(graphName, serviceName)
  return (await DB.read<SchemaIndex[]>(SCHEMAS, key, 'json')) || []
}

export function syncIndex(
  graphName: string,
  serviceName: string,
  versions: SchemaIndex[],
) {
  const key = key_owner(graphName, serviceName)
  return DB.write(SCHEMAS, key, versions)
}

export function remove(graphName: string, serviceName: string, uid: string) {
  const key = key_item(graphName, serviceName, uid)
  return DB.remove(SCHEMAS, key)
}

export function save(item: Schema) {
  const key = key_item(item.graph_name, item.service_name, item.uid)
  return DB.write(SCHEMAS, key, item)
}

export async function insert(schema: NewSchema) {
  const values: Schema = {
    uid: ulid(),
    graph_name: schema.graph_name,
    hash: fnv1a(schema.type_defs).toString(),
    service_name: schema.service_name,
    is_active: schema.is_active,
    type_defs: schema.type_defs,
    created_at: Date.now(),
    updated_at: null,
  }

  if (!(await save(values))) {
    return false
  }

  let allSchemas = (await list(schema.graph_name, schema.service_name)).concat({
    uid: values.uid,
    service_name: values.service_name,
    graph_name: values.graph_name,
    hash: values.hash,
  })

  const sorted = sort(allSchemas).desc((u) => u.uid)

  if (!(await syncIndex(schema.graph_name, schema.service_name, sorted))) {
    return false
  }

  return values
}
