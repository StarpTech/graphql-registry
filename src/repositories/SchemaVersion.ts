import * as DB from 'worktop/kv'
import type { KV } from 'worktop/kv'
import { sort } from 'fast-sort'
import { ulid } from 'worktop/utils'

// cloudflare global kv binding
declare const VERSIONS: KV.Namespace

export interface SchemaVersion {
  uid: string
  schema_id: string
  version: string
  service_name: string
  created_at: number
}

export interface SchemaVersionIndex {
  uid: string
  schema_id: string
  version: string
}

export type NewSchemaVersion = Omit<SchemaVersion, 'created_at' | 'uid'>

export const key_owner = (graphName: string, serviceName: string) =>
  `graphs::${graphName}::services::${serviceName}::versions`
export const key_item = (
  graphName: string,
  serviceName: string,
  version: string,
) => `graphs::${graphName}::services::${serviceName}::versions::${version}`

export async function list(
  graphName: string,
  serviceName: string,
): Promise<SchemaVersionIndex[]> {
  const key = key_owner(graphName, serviceName)
  return (await DB.read<SchemaVersionIndex[]>(VERSIONS, key, 'json')) || []
}

export function syncIndex(
  graphName: string,
  serviceName: string,
  versions: SchemaVersionIndex[],
) {
  const key = key_owner(graphName, serviceName)
  return DB.write(VERSIONS, key, versions)
}

export function find(graphName: string, serviceName: string, version: string) {
  const key = key_item(graphName, serviceName, version)
  return DB.read<SchemaVersion>(VERSIONS, key, 'json')
}

export function remove(
  graphName: string,
  serviceName: string,
  version: string,
) {
  const key = key_item(graphName, serviceName, version)
  return DB.remove(VERSIONS, key)
}

export function save(
  graphName: string,
  serviceName: string,
  item: SchemaVersion,
) {
  const key = key_item(graphName, serviceName, item.version)
  return DB.write(VERSIONS, key, item)
}

export async function insert(
  graphName: string,
  serviceName: string,
  version: NewSchemaVersion,
) {
  const values: SchemaVersion = {
    uid: ulid(),
    schema_id: version.schema_id,
    version: version.version,
    service_name: version.service_name,
    created_at: Date.now(),
  }

  if (!(await save(graphName, serviceName, values))) {
    return false
  }

  let allVersions = (await list(graphName, serviceName)).concat({
    uid: values.uid,
    version: values.version,
    schema_id: values.schema_id,
  })

  const sorted = sort(allVersions).desc((u) => u.uid)

  if (!(await syncIndex(graphName, serviceName, sorted))) {
    return false
  }

  return values
}
