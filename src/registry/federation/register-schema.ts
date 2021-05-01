import { SchemaService } from '../../core/services/Schema'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaResponseModel, SuccessResponse } from '../../core/types'
import { FastifyInstance, FastifySchema } from 'fastify'
export interface RegisterRequest {
  service_name: string
  version: string
  type_defs: string
  graph_name: string
}

export const schema: FastifySchema = {
  response: {
    '2xx': {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          required: ['version', 'typeDefs', 'serviceName', 'schemaId'],
          properties: {
            version: { type: 'string', minLength: 1, maxLength: 100 },
            typeDefs: { type: 'string', minLength: 1, maxLength: 10000 },
            serviceName: {
              type: 'string',
              minLength: 1,
              pattern: '[a-zA-Z_\\-0-9]+',
            },
            schemaId: { type: 'number', minimum: 1 },
          },
        },
      },
    },
  },
  body: {
    type: 'object',
    required: ['version', 'type_defs', 'service_name', 'graph_name'],
    properties: {
      version: { type: 'string', minLength: 1, maxLength: 100 },
      type_defs: { type: 'string', minLength: 1, maxLength: 10000 },
      service_name: {
        type: 'string',
        minLength: 1,
        pattern: '[a-zA-Z_\\-0-9]+',
      },
      graph_name: { type: 'string', minLength: 1, pattern: '[a-zA-Z_\\-0-9]+' },
    },
  },
}

export default function registerSchema(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterRequest }>('/schema/push', { schema }, async (req, res) => {
    /**
     * Validate if user is able to register a schema in the name of the service
     */

    if (req.user && !req.user.services.find((service) => service === req.body.service_name)) {
      res.code(401)
      return {
        success: false,
        error: `You are not authorized to access service "${req.body.service_name}"`,
      }
    }
    /**
     * Validate new schema with existing schemas of all services
     */

    const serviceModels = await fastify.prisma.service.findMany({
      where: {
        isActive: true,
        graph: {
          name: req.body.graph_name,
          isActive: true,
        },
      },
      select: {
        name: true,
      },
    })
    const allServiceNames = serviceModels.map((s) => s.name)
    const allServiceVersions = allServiceNames
      .filter((s) => s !== req.body.service_name)
      .map((s) => ({
        name: s,
      }))

    const schmemaService = new SchemaService(fastify.prisma)
    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.body.graph_name,
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
      name: req.body.service_name,
      typeDefs: req.body.type_defs,
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
        name: req.body.graph_name,
      },
      update: {},
      where: {
        name: req.body.graph_name,
      },
    })

    /**
     * Create new service
     */

    let service = await fastify.prisma.service.findFirst({
      where: {
        name: req.body.service_name,
        graph: {
          name: req.body.graph_name,
        },
      },
    })

    if (!service) {
      service = await fastify.prisma.service.create({
        data: {
          name: req.body.service_name,
          graphId: graph.id,
        },
      })
    }

    /**
     * Create new schema
     */

    let schema = await fastify.prisma.schema.findFirst({
      where: {
        typeDefs: req.body.type_defs,
        service: {
          name: req.body.service_name,
        },
        graph: {
          name: req.body.graph_name,
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
          typeDefs: req.body.type_defs,
          // Create new version
          SchemaVersion: {
            create: {
              version: req.body.version,
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
          version: req.body.version,
          schemaId: schema.id,
          serviceId: service.id,
        },
      })
    }

    const responseBody: SuccessResponse<SchemaResponseModel> = {
      success: true,
      data: {
        schemaId: schema.id,
        serviceName: schema.service.name,
        typeDefs: schema.typeDefs,
        version: req.body.version,
      },
    }

    return responseBody
  })
}
