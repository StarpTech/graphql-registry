import * as DB from 'worktop/kv'
import type { KV } from 'worktop/kv'
import { sort } from 'fast-sort'
import ULID from '../ulid'

// cloudflare global kv binding
declare const SERVICES: KV.Namespace

export interface SchemaVersion {
  uid: string
  schema_id: string
  version: string
  service_name: string
  created_at: number
}

export interface SchemaVersionMetadata {
  uid: string
  schema_id: string
  version: string
}

export type NewSchemaVersion = Omit<SchemaVersion, 'created_at' | 'uid'>

export const key_owner = (serviceName: string) =>
  `services::${serviceName}::versions`
export const key_item = (serviceName: string, version: string) =>
  `services::${serviceName}::versions::${version}`

export async function list(
  serviceName: string,
): Promise<SchemaVersionMetadata[]> {
  const key = key_owner(serviceName)
  return (await DB.read<SchemaVersionMetadata[]>(SERVICES, key, 'json')) || []
}

export function sync(serviceName: string, versions: SchemaVersionMetadata[]) {
  const key = key_owner(serviceName)
  return DB.write(SERVICES, key, versions)
}

export function find(serviceName: string, version: string) {
  const key = key_item(serviceName, version)
  return DB.read<SchemaVersion>(SERVICES, key, 'json')
}

export function save(serviceName: string, item: SchemaVersion) {
  const key = key_item(serviceName, item.version)
  return DB.write(SERVICES, key, item)
}

export async function findLatestServiceSchemaVersion(serviceName: string) {
  const all = await list(serviceName)
  // because list is lexicographically sorted
  return all[0]
}

export async function insert(serviceName: string, version: NewSchemaVersion) {
  const values: SchemaVersion = {
    uid: ULID(),
    schema_id: version.schema_id,
    version: version.version,
    service_name: version.service_name,
    created_at: Date.now(),
  }

  if (!(await save(serviceName, values))) {
    return false
  }

  let allVersions = (await list(serviceName)).concat({
    uid: values.uid,
    version: values.version,
    schema_id: values.schema_id,
  })

  const sorted = sort(allVersions).desc((u) => u.uid)

  if (!(await sync(serviceName, sorted))) {
    return false
  }

  return values
}
