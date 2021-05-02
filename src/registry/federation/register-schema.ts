import S from 'fluent-json-schema'
import { SchemaService } from '../../core/services/Schema'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaResponseModel, SuccessResponse } from '../../core/types'

import { FastifyInstance, FastifySchema } from 'fastify'
import { SchemaCompositionError, SchemaVersionLookupError } from '../../core/errrors'
import { checkUserServiceScope } from '../../core/hook-handler/user-scope.prevalidation'
export interface RequestContext {
  Body: {
    service_name: string
    version: string
    type_defs: string
    graph_name: string
  }
}

export const schema: FastifySchema = {
  response: {
    '2xx': S.object()
      .additionalProperties(false)
      .required(['success', 'data'])
      .prop('success', S.boolean())
      .prop(
        'data',
        S.object()
          .required(['version', 'typeDefs', 'serviceName', 'schemaId'])
          .prop('schemaId', S.number().minimum(1))
          .prop('version', S.string().minLength(1).maxLength(100))
          .prop('typeDefs', S.string().minLength(1).maxLength(10000))
          .prop('serviceName', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+')),
      ),
  },
  body: S.object()
    .additionalProperties(false)
    .required(['version', 'type_defs', 'service_name', 'graph_name'])
    .prop('graph_name', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+'))
    .prop('version', S.string().minLength(1).maxLength(100))
    .prop('type_defs', S.string().minLength(1).maxLength(10000))
    .prop('service_name', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+')),
}

export default function registerSchema(fastify: FastifyInstance) {
  fastify.post<RequestContext>(
    '/schema/push',
    { schema, preValidation: checkUserServiceScope },
    async (req, res) => {
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
        throw SchemaVersionLookupError(findError.message)
      }

      const serviceSchemas = schemas.map((s) => ({
        name: s.serviceName,
        typeDefs: s.typeDefs,
      }))
      // Add the new schema to validate it against the current registry state before creating.
      serviceSchemas.push({
        name: req.body.service_name,
        typeDefs: req.body.type_defs,
      })

      const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

      if (schemaError) {
        throw SchemaCompositionError(schemaError)
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
            SchemaTag: {
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
         * Create new schema tag
         */
        const schemaTag = await fastify.prisma.schemaTag.findFirst({
          where: {
            version: req.body.version,
            schemaId: schema.id,
            serviceId: service.id,
          },
        })
        if (!schemaTag) {
          await fastify.prisma.schemaTag.create({
            data: {
              version: req.body.version,
              schemaId: schema.id,
              serviceId: service.id,
            },
          })
        }
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
    },
  )
}
