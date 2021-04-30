import { object, pattern, size, string, validate } from 'superstruct'
import { SchemaService } from './services/Schema'
import { composeAndValidateSchema } from './federation'
import { SchemaResponseModel, SuccessResponse } from '../core/types'
import { FastifyInstance } from 'fastify'

interface RegisterRequest {
  service_name: string
  version: string
  type_defs: string
  graph_name: string
}

const validateRequest = object({
  version: size(string(), 1, 100),
  type_defs: size(string(), 1, 10000),
  service_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
  graph_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
})

export default function registerSchema(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterRequest }>('/schema/push', async (req, res) => {
    const requestBody = req.body
    const [error, input] = validate(requestBody, validateRequest)
    if (!input || error) {
      res.code(400)
      return {
        success: false,
        error: error?.message,
      }
    }
    /**
     * Validate new schema with existing schemas of all services
     */
    const serviceModels = await fastify.prisma.service.findMany({
      where: {
        isActive: true,
        graph: {
          name: input.graph_name,
          isActive: true,
        },
      },
      select: {
        name: true,
      },
    })
    const allServiceNames = serviceModels.map((s) => s.name)
    const allServiceVersions = allServiceNames
      .filter((s) => s !== input.service_name)
      .map((s) => ({
        name: s,
      }))

    const schmemaService = new SchemaService(fastify.prisma)
    const {
      schemas,
      error: findError,
    } = await schmemaService.findByServiceVersions(
      input.graph_name,
      allServiceVersions,
    )

    if (findError) {
      res.code(400)
      return {
        success: false,
        error: findError.message,
      }
    }

    const serviceSchemas = schemas.map((s) => ({
      name: s.serviceName,
      typeDefs: s.typeDefs,
    }))

    serviceSchemas.push({
      name: input.service_name,
      typeDefs: input.type_defs,
    })

    const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

    if (schemaError) {
      res.code(400)
      return {
        success: false,
        error: schemaError,
      }
    }

    /**
     * Create new graph
     */

    let graph = await fastify.prisma.graph.upsert({
      create: {
        name: input.graph_name,
      },
      update: {},
      where: {
        name: input.graph_name,
      },
    })

    /**
     * Create new service
     */

    let service = await fastify.prisma.service.findFirst({
      where: {
        name: input.service_name,
        graph: {
          name: input.graph_name,
        },
      },
    })

    if (!service) {
      service = await fastify.prisma.service.create({
        data: {
          name: input.service_name,
          graphId: graph.id,
        },
      })
    }

    /**
     * Create new schema
     */
    let schema = await fastify.prisma.schema.findFirst({
      where: {
        typeDefs: input.type_defs,
        service: {
          name: input.service_name,
        },
        graph: {
          name: input.graph_name,
        },
      },
      include: {
        service: true,
      },
    })

    if (!schema) {
      schema = await fastify.prisma.schema.create({
        data: {
          graphId: graph.id,
          serviceId: service.id,
          typeDefs: input.type_defs,
          // Create new version
          SchemaVersion: {
            create: {
              version: input.version,
              serviceId: service.id,
            },
          },
        },
        include: {
          service: true,
        },
      })
    } else {
      await fastify.prisma.schema.update({
        where: {
          id: schema.id,
        },
        data: {
          updatedAt: new Date(),
        },
      })

      /**
       * Create new schema version
       */
      await fastify.prisma.schemaVersion.create({
        data: {
          version: input.version,
          schemaId: schema.id,
          serviceId: service.id,
        },
      })
    }

    const responseBody: SuccessResponse<SchemaResponseModel> = {
      success: true,
      data: {
        serviceName: schema.service.name,
        graphName: graph.name,
        typeDefs: schema.typeDefs,
        version: input.version,
      },
    }

    return responseBody
  })
}
