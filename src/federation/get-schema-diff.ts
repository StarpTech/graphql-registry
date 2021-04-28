import { FastifyInstance } from 'fastify'
import { object, pattern, size, string, validate } from 'superstruct'
import { diff } from '@graphql-inspector/core'
import { composeAndValidateSchema } from './federation'
import { SchemaService } from './services/Schema'

interface GetSchemaDiffRequest {
  service_name: string
  type_defs: string
  graph_name: string
}

const validateRequest = object({
  type_defs: size(string(), 1, 10000),
  service_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
  graph_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
})

export default function getSchemaDiff(fastify: FastifyInstance) {
  fastify.post<{ Body: GetSchemaDiffRequest }>(
    '/schema/diff',
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

      const graph = await fastify.prisma.graph.findFirst({
        where: {
          isActive: true,
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

      let serviceSchemas = schemas.map((s) => ({
        name: s.serviceName,
        typeDefs: s.typeDefs,
      }))

      let original = composeAndValidateSchema(serviceSchemas)
      if (!original.schema) {
        res.code(400)
        return {
          success: false,
          error: original.error,
        }
      }

      if (original.error) {
        res.code(400)
        return {
          success: false,
          error: original.error,
        }
      }

      serviceSchemas = serviceSchemas
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

      const result = diff(original.schema, updated.schema)

      return {
        success: true,
        data: result,
      }
    },
  )
}
