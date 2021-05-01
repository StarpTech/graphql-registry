import { FastifyInstance, FastifySchema } from 'fastify'
import { composeAndValidateSchema } from './federation'
import { SchemaResponseModel, SuccessResponse } from '../core/types'
import { SchemaService } from './services/Schema'

interface ServiceVersionMatch {
  name: string
  version: string
}

interface GetSchemaByVersionsRequest {
  graph_name: string
  services: ServiceVersionMatch[]
}

export const schema: FastifySchema = {
  body: {
    type: 'object',
    required: ['services', 'graph_name'],
    properties: {
      services: {
        type: 'array',
        items: [
          {
            type: 'object',
            required: ['name'],
            properties: {
              name: {
                minLength: 1,
                pattern: '[a-zA-Z_\\-0-9]+',
              },
              version: {
                minLength: 1,
              },
            },
          },
        ],
      },
      graph_name: { type: 'string', minLength: 1, pattern: '[a-zA-Z_\\-0-9]+' },
    },
  },
}

export default function getComposedSchemaVersions(fastify: FastifyInstance) {
  fastify.post<{ Body: GetSchemaByVersionsRequest }>(
    '/schema/compose',
    { schema },
    async (req, res) => {
      const graph = await fastify.prisma.graph.findFirst({
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

      const allServiceVersions: ServiceVersionMatch[] = req.body.services.map(
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

      const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

      if (schemaError) {
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
