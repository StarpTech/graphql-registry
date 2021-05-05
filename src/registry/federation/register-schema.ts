import S from 'fluent-json-schema'
import { SchemaManager } from '../../core/manager/SchemaManager'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaResponseModel, SuccessResponse } from '../../core/types'
import { FastifyInstance, FastifySchema } from 'fastify'
import { SchemaCompositionError, SchemaVersionLookupError } from '../../core/errrors'
import { checkUserServiceScope } from '../../core/hook-handler/user-scope.prevalidation'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import SchemaTagRepository from '../../core/repositories/SchemaTagRepository'

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
  fastify.post<RequestContext>('/schema/push', { schema, preValidation: checkUserServiceScope }, async (req, res) => {
    /**
     * Validate new schema with existing schemas of all active services
     */

    const serviceRepository = new ServiceRepository(fastify.knex)
    const schemaRepository = new SchemaRepository(fastify.knex)
    const graphRepository = new GraphRepository(fastify.knex)
    const schemaTagRepository = new SchemaTagRepository(fastify.knex)

    const serviceModels = await serviceRepository.findManyExceptWithName(
      {
        graphName: req.body.graph_name,
      },
      req.body.service_name,
    )

    const allLatestServices = serviceModels.map((s) => ({ name: s.name }))
    const schmemaService = new SchemaManager(serviceRepository, schemaRepository)
    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.body.graph_name,
      allLatestServices,
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

    let graph = await graphRepository.findFirst({
      name: req.body.graph_name,
    })

    if (!graph) {
      graph = await graphRepository.create({ name: req.body.graph_name })
    }

    /**
     * Create new service
     */

    let service = await serviceRepository.findFirst({
      graphName: req.body.graph_name,
      name: req.body.service_name,
    })

    if (!service) {
      service = await serviceRepository.create({
        name: req.body.service_name,
        graphId: graph.id,
      })
    }

    /**
     * Create new schema
     */

    let schema = await schemaRepository.findFirst({
      graphName: req.body.graph_name,
      serviceName: req.body.service_name,
      typeDefs: req.body.type_defs,
    })

    if (!schema) {
      schema = await schemaRepository.create({
        graphId: graph.id,
        serviceId: service.id,
        typeDefs: req.body.type_defs,
      })
      await schemaTagRepository.create({
        version: req.body.version,
        schemaId: schema.id,
      })
    } else {
      await schemaRepository.updateById(schema.id, {
        updatedAt: new Date(),
      })

      /**
       * Create new schema tag
       */
      const schemaTag = await schemaTagRepository.findByVersion({
        version: req.body.version,
        schemaId: schema.id,
        serviceId: service.id,
      })

      if (!schemaTag) {
        await schemaTagRepository.create({
          version: req.body.version,
          schemaId: schema.id,
        })
      }
    }

    const responseBody: SuccessResponse<SchemaResponseModel> = {
      success: true,
      data: {
        schemaId: schema.id,
        serviceName: req.body.service_name,
        typeDefs: schema.typeDefs,
        version: req.body.version,
      },
    }

    return responseBody
  })
}
