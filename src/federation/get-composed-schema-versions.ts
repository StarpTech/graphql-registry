import { FastifyInstance } from 'fastify'
import { array, object, pattern, size, string, validate } from 'superstruct'
import { composeAndValidateSchema } from './federation'
import { SchemaResponseModel, SuccessResponse } from '../core/types'
import { SchemaService } from './services/Schema'

interface ServiceVersionMatch {
  name: string
  version: string
}

interface GetSchemaByVersionsRequest {
  services: ServiceVersionMatch[]
}

const validateRequest = object({
  graph_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
  services: array(
    object({
      version: size(string(), 1, 100),
      name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
    }),
  ),
})

export default function getComposedSchemaVersions(fastify: FastifyInstance) {
  fastify.post<{ Body: GetSchemaByVersionsRequest }>(
    '/schema/compose',
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

      const allServiceVersions: ServiceVersionMatch[] = input.services.map(
        (s) => ({
          name: s.name,
          version: s.version,
        }),
      )

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

      const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

      if (error) {
        res.code(400)
        return {
          success: false,
          error: schemaError,
        }
      }

      const responseBody: SuccessResponse<SchemaResponseModel[]> = {
        success: true,
        data: schemas,
      }

      return responseBody
    },
  )
}
