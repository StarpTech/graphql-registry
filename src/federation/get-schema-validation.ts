import { FastifyInstance } from 'fastify'
import { object, pattern, size, string, validate } from 'superstruct'
import { composeAndValidateSchema } from './federation'
import { SchemaService } from './services/Schema'

interface GetSchemaValidationRequest {
  service_name: string
  type_defs: string
  graph_name: string
}

const validateRequest = object({
  type_defs: size(string(), 1, 10000),
  service_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
  graph_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
})

export default function getSchemaValidation(fastify: FastifyInstance) {
  fastify.post<{ Body: GetSchemaValidationRequest }>(
    '/schema/validate',
    async (req, res) => {
      const requestBody = req.body
      const [error, input] = validate(requestBody, validateRequest)
      if (!input || error) {
        res.code(400)
        return {
          success: false,
          error: error?.message,
        }
      }

      const graph = await fastify.prisma.graph.deleteMany({
        where: {
          name: input.graph_name,
        },
      })
      if (!graph) {
        res.code(404)
        return {
          success: false,
          error: `Graph with name "${input.graph_name}" does not exist`,
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

      let serviceSchemas = schemas
        .map((s) => ({
          name: s.serviceName,
          typeDefs: s.typeDefs,
        }))
        .filter((schema) => schema.name !== input.service_name)
        .concat({
          name: input.service_name,
          typeDefs: input.type_defs,
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
