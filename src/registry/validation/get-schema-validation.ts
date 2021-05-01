import { FastifyInstance, FastifySchema } from 'fastify'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaService } from '../../core/services/Schema'

interface GetSchemaValidationRequest {
  service_name: string
  type_defs: string
  graph_name: string
}

export const schema: FastifySchema = {
  body: {
    type: 'object',
    required: ['type_defs', 'service_name', 'graph_name'],
    properties: {
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

export default function getSchemaValidation(fastify: FastifyInstance) {
  fastify.post<{ Body: GetSchemaValidationRequest }>(
    '/schema/validate',
    { schema },
    async (req, res) => {
      const graph = await fastify.prisma.graph.deleteMany({
        where: {
          name: req.body.graph_name,
          isActive: true,
        },
      })
      if (!graph) {
        res.code(404)
        return {
          success: false,
          error: `Graph with name "${req.body.graph_name}" does not exist`,
        }
      }

      const serviceModels = await fastify.prisma.service.findMany({
        select: {
          name: true,
        },
      })
      const allServiceNames = serviceModels.map((s) => s.name)

      if (!allServiceNames.length) {
        return res.send({
          success: true,
          data: [],
        })
      }

      const allServiceVersions = allServiceNames.map((s) => ({
        name: s,
      }))

      const schmemaService = new SchemaService(fastify.prisma)
      const {
        schemas,
        error: findError,
      } = await schmemaService.findByServiceVersions(
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

      let serviceSchemas = schemas
        .map((s) => ({
          name: s.serviceName,
          typeDefs: s.typeDefs,
        }))
        .filter((schema) => schema.name !== req.body.service_name)
        .concat({
          name: req.body.service_name,
          typeDefs: req.body.type_defs,
        })

      const updated = composeAndValidateSchema(serviceSchemas)
      if (!updated.schema) {
        res.code(400)
        return {
          success: false,
          error: updated.error,
        }
      }
      if (updated.error) {
        res.code(400)
        return {
          success: false,
          error: updated.error,
        }
      }

      return {
        success: true,
      }
    },
  )
}
