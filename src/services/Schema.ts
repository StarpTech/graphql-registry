import fnv1a from '@sindresorhus/fnv1a'
import { find as findService } from '../repositories/Service'
import {
  list as listSchemaVersionLinks,
  find as findServiceSchemaVersion,
} from '../repositories/SchemaVersion'
import { SchemaWithVersionModel } from '../types'
import {
  find as findSchemaById,
  findByHash as findSchemaByHash,
} from '../repositories/Schema'
import { SchemaVersionService } from './SchemaVersion'

export interface ServiceSchemaVersionMatch {
  name: string
  version?: string
}

export class SchemaService {
  async findByTypeDefsHash(typeDefs: string) {
    const hash = await fnv1a(typeDefs)
    const meta = await findSchemaByHash(hash.toString())
    if (!meta) {
      return false
    }
    return findSchemaById(meta.uid)
  }
  async findByServiceVersions(
    services: ServiceSchemaVersionMatch[],
  ): Promise<{ schemas: SchemaWithVersionModel[]; error: Error | null }> {
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
        error = new Error(
          `Service "${service.name}" has no versions registered`,
        )
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

          const schema = await findSchemaById(schemaVersion.schema_id)

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
        const schemaVersionService = new SchemaVersionService()
        const schemaVersion = await schemaVersionService.findLatestVersion(
          service.name,
        )

        if (!schemaVersion) {
          error = new Error(
            `Service "${service.name}" has no schema registered`,
          )
          break
        }

        const schema = await findSchemaById(schemaVersion.schema_id)

        if (!schema) {
          error = new Error(
            `Service "${service.name}" has no schema with id "${schemaVersion.schema_id}" registered`,
          )
          break
        }

        if (!schema.is_active) {
          continue
        }

        schemas.push({
          ...schema,
          version: schemaVersion.version,
        })
      }
    }

    return { error, schemas }
  }
}
