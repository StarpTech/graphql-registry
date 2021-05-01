import { PrismaClient } from '@prisma/client'

export interface ServiceSchemaVersionMatch {
  name: string
  version?: string
}

export class SchemaService {
  dbClient: PrismaClient

  constructor(client: PrismaClient) {
    this.dbClient = client
  }

  async findByHash(graphName: string, serviceName: string, typeDefs: string) {
    const schema = await this.dbClient.schema.findFirst({
      where: {
        typeDefs: typeDefs,
        graph: {
          name: graphName,
          isActive: true
        },
        service: {
          name: serviceName,
          isActive: true
        },
      },
    })

    if (!schema) {
      return false
    }

    return schema
  }

  async findByServiceVersions(
    graphName: string,
    services: ServiceSchemaVersionMatch[],
  ) {
    const schemas = []
    let error: Error | null = null

    const serviceItems = await this.dbClient.service.findMany({
      where: {
        name: {
          in: services.map((s) => s.name),
        },
        graph: {
          name: graphName,
          isActive: true
        },
        isActive: true,
      },
      orderBy: {
        name: 'asc'
      }
    })

    for await (const service of serviceItems) {
      const match = services.find((s) => s.name === service.name)
      const version = match?.version

      if (!match) {
        error = new Error(`Service "${service.name}" does not exists`)
        break
      }

      if (version) {
        const schema = await this.dbClient.schema.findFirst({
          where: {
            graph: {
              name: graphName,
              isActive: true,
            },
            service: {
              name: service.name,
              isActive: true,
            },
            SchemaVersion: {
              every: {
                isActive: true,
                version: version,
              },
            },
            isActive: true,
          },
          include: {
            SchemaVersion: true,
          },
        })

        if (!schema) {
          error = new Error(
            `Service "${service.name}" has no schema in version "${version}" registered`,
          )
          break
        }

        schemas.push({
          serviceName: service.name,
          typeDefs: schema.typeDefs,
          version: schema.SchemaVersion[0].version,
        })
      } else {
        const schemaVersion = await this.dbClient.schemaVersion.findFirst({
          where: {
            isActive: true,
            schema: {
              graph: {
                name: graphName,
                isActive: true,
              },
              service: {
                name: service.name,
                isActive: true,
              },
            },
          },
          // very unlikely that a schema from the same service in the same graph was created at the same milisecond
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            schema: true,
          },
        })

        if (!schemaVersion) {
          error = new Error(
            `Service "${service.name}" has no schema version registered`,
          )
          break
        }

        schemas.push({
          serviceName: service.name,
          typeDefs: schemaVersion.schema.typeDefs,
          version: schemaVersion.version,
        })
      }
    }

    return { error, schemas }
  }
}
