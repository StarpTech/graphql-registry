import { CURRENT_VERSION } from '../constants'
import SchemaRepository from '../repositories/SchemaRepository'
import ServiceRepository from '../repositories/ServiceRepository'

export interface ServiceSchemaVersionMatch {
  name: string
  version?: string
}

export class SchemaManager {
  private serviceRepository: ServiceRepository
  private schemaRepository: SchemaRepository

  constructor(serviceRepository: ServiceRepository, schemaRepository: SchemaRepository) {
    this.serviceRepository = serviceRepository
    this.schemaRepository = schemaRepository
  }

  async findByServiceVersions(graphName: string, serviceMatches: ServiceSchemaVersionMatch[]) {
    const schemas = []
    let error: Error | null = null

    const serviceItems = await this.serviceRepository.findByNames(
      {
        graphName,
      },
      serviceMatches.map((s) => s.name),
    )

    for await (const serviceMatch of serviceMatches) {
      const service = serviceItems.find((s) => s.name === serviceMatch.name)

      if (!service) {
        error = new Error(
          `In graph "${graphName}" service "${serviceMatch.name}" could not be found`,
        )
        break
      }

      const version = serviceMatch.version

      if (version) {
        let schema = await this.schemaRepository.findBySchemaTagVersion({
          graphName,
          serviceName: service.name,
          version,
        })

        if (!schema) {
          error = new Error(
            `In graph "${graphName}", service "${service.name}" has no schema in version "${version}" registered`,
          )
          break
        }

        schemas.push({
          schemaId: schema.id,
          serviceName: service.name,
          typeDefs: schema.typeDefs,
          version: version,
        })
      } else {
        const schema = await this.schemaRepository.findLastUpdated({
          graphName,
          serviceName: service.name,
        })

        if (!schema) {
          error = new Error(
            `In graph "${graphName}", service "${service.name}" has no schema registered`,
          )
          break
        }

        schemas.push({
          schemaId: schema.id,
          serviceName: service.name,
          typeDefs: schema.typeDefs,
          version: schema.version,
        })
      }
    }

    return { error, schemas }
  }
}
