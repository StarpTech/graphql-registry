import * as DB from 'worktop/kv'
import fnv1a from '@sindresorhus/fnv1a'
import type { KV } from 'worktop/kv'
import { find as findService } from './Service'
import {
  list as listSchemaVersionLinks,
  find as findServiceSchemaVersion,
  findLatestServiceSchemaVersion,
} from './SchemaVersion'
import { SchemaResponseModel } from '../types'

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
): Promise<{ schemas: SchemaResponseModel[]; error: Error | null }> {
  const schemas = []
  let error: Error | null = null
  for await (const service of services) {
    const serviceItem = await findService(service.name)

    if (!serviceItem) {
      error = new Error(`Service "${service.name}" does not exist`)
      break
    }

    if (!serviceItem.is_active) {
      continue
    }

    const links = await listSchemaVersionLinks(service.name)

    if (links.length === 0) {
      error = new Error(`Service "${service.name}" has no versions registered`)
      break
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
          error = new Error(
            `Service "${service.name}" has no schema in version "${service.version}" registered`,
          )
          break
        }

        const schema = await find(service.name, schemaVersion.schema_id)

        if (!schema) {
          error = new Error(
            `Service "${service.name}" has no schema with id "${schemaVersion.schema_id}" registered`,
          )
          break
        }

        if (!schema.is_active) {
          error = new Error(
            `Schema with id "${schemaVersion.schema_id}" is not active`,
          )
          break
        }

        schemas.push({
          ...schema,
          version: schemaVersion.version,
        })
      } else {
        error = new Error(
          `Service "${service.name}" in version "${service.version}" is not registered`,
        )
        break
      }
    } else {
      const schemaVersion = await findLatestServiceSchemaVersion(service.name)

      if (!schemaVersion) {
        error = new Error(`Service "${service.name}" has no schema registered`)
        break
      }

      const schema = await find(service.name, schemaVersion.schema_id)

      if (!schema) {
        error = new Error(
          `Service "${service.name}" has no schema with id "${schemaVersion.schema_id}" registered`,
        )
        break
      }

      schemas.push({
        ...schema,
        version: schemaVersion.version,
      })
    }
  }

  return { error, schemas }
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
