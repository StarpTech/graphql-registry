import * as DB from 'worktop/kv'
import fnv1a from '@sindresorhus/fnv1a'
import type { KV } from 'worktop/kv'
import { find as findService } from './Service'
import {
  list as listSchemaVersionLinks,
  find as findServiceSchemaVersion,
  findLatestServiceSchemaVersion,
} from './SchemaVersion'

// cloudflare global kv binding
declare const SERVICES: KV.Namespace

export interface Schema {
  uid: string
  service_id: string
  is_active: boolean
  type_defs: string
  updated_at: number | null
  created_at: number
}

export interface ServiceSchemaVersionMatch {
  name: string
  version?: string
}

export type NewSchema = Omit<Schema, 'created_at' | 'updated_at' | 'uid'>

export const key_item = (serviceName: string, uid: string) =>
  `services::${serviceName}::schemas::${uid}`

export function find(serviceName: string, uid: string) {
  const key = key_item(serviceName, uid)
  return DB.read<Schema>(SERVICES, key, 'json')
}

export function findByTypeDefs(serviceName: string, typeDefs: string) {
  const uid = fnv1a(typeDefs).toString()
  const key = key_item(serviceName, uid)
  return DB.read<Schema>(SERVICES, key, 'json')
}

export async function findByServiceVersions(
  services: ServiceSchemaVersionMatch[],
) {
  const schemas = []
  for await (const service of services) {
    const serviceItem = await findService(service.name)

    if (!serviceItem) {
      throw new Error(`Service "${service.name}" does not exist`)
    }

    if (!serviceItem.is_active) {
      continue
    }

    const links = await listSchemaVersionLinks(service.name)

    if (links.length === 0) {
      throw new Error(`Service "${service.name}" has no versions registered`)
    }

    if (service.version) {
      const matchedLink = links.find(
        (schemaVersion) => schemaVersion.version === service.version,
      )
      if (matchedLink) {
        const schemaVersion = await findServiceSchemaVersion(
          service.name,
          service.version,
        )

        if (!schemaVersion) {
          throw new Error(
            `Service "${service.name}" has no schema in version "${service.version}" registered`,
          )
        }

        const schema = await find(service.name, schemaVersion.schema_id)

        if (!schema) {
          throw new Error(
            `Service "${service.name}" has no schema with id "${schemaVersion.schema_id}" registered`,
          )
        }

        if (!schema.is_active) {
          throw new Error(
            `Schema with id "${schemaVersion.schema_id}" is not active`,
          )
        }

        schemas.push({
          ...schema,
          version: schemaVersion.version,
        })
      } else {
        throw new Error(
          `Service "${service.name}" in version "${service.version}" is not registered`,
        )
      }
    } else {
      const schemaVersion = await findLatestServiceSchemaVersion(service.name)

      if (!schemaVersion) {
        throw new Error(`Service "${service.name}" has no schema registered`)
      }

      const schema = await find(service.name, schemaVersion.schema_id)

      if (!schema) {
        throw new Error(
          `Service "${service.name}" has no schema with id "${schemaVersion.schema_id}" registered`,
        )
      }

      schemas.push({
        ...schema,
        version: schemaVersion.version,
      })
    }
  }

  return schemas
}

export function save(serviceName: string, item: Schema) {
  const key = key_item(serviceName, item.uid)
  return DB.write(SERVICES, key, item)
}

export async function insert(serviceName: string, schema: NewSchema) {
  const values: Schema = {
    uid: fnv1a(schema.type_defs).toString(),
    service_id: schema.service_id,
    is_active: schema.is_active,
    type_defs: schema.type_defs,
    created_at: Date.now(),
    updated_at: null,
  }

  if (!(await save(serviceName, values))) {
    return false
  }

  return values
}
