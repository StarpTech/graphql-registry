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

  async findByServiceVersions(graphName: string, services: ServiceSchemaVersionMatch[]) {
    const schemas = []
    let error: Error | null = null

    const serviceItems = await this.dbClient.service.findMany({
      where: {
        name: {
          in: services.map((s) => s.name),
        },
        graph: {
          name: graphName,
          isActive: true,
        },
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
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
            SchemaTag: {
              some: {
                isActive: true,
                version: version,
              },
            },
            isActive: true,
          },
          include: {
            SchemaTag: true,
          },
        })

        if (!schema) {
          error = new Error(`Service "${service.name}" has no schema in version "${version}" registered`)
          break
        }

        schemas.push({
          schemaId: schema.id,
          serviceName: service.name,
          typeDefs: schema.typeDefs,
          version: schema.SchemaTag[0].version,
        })
      } else {
        const schemaTag = await this.dbClient.schemaTag.findFirst({
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
              isActive: true,
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

        if (!schemaTag) {
          error = new Error(`Service "${service.name}" has no schema registered`)
          break
        }

        schemas.push({
          schemaId: schemaTag.id,
          serviceName: service.name,
          typeDefs: schemaTag.schema.typeDefs,
          version: schemaTag.version,
        })
      }
    }

    return { error, schemas }
  }
}
