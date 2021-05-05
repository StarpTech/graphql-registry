import S from 'fluent-json-schema'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaService } from '../../core/services/SchemaService'
import { FastifyInstance, FastifySchema } from 'fastify'
import { InvalidGraphNameError, SchemaCompositionError, SchemaVersionLookupError } from '../../core/errrors'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import SchemaTagRepository from '../../core/repositories/SchemaTagRepository'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'

export interface RequestContext {
  Querystring: {
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
        S.array().items(
          S.object()
            .required(['version', 'typeDefs', 'serviceName', 'schemaId'])
            .prop('schemaId', S.number().minimum(1))
            .prop('version', S.string().minLength(1).maxLength(100))
            .prop('typeDefs', S.string().minLength(1).maxLength(10000))
            .prop('serviceName', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+')),
        ),
      ),
  },
  querystring: S.object()
    .required(['graph_name'])
    .additionalProperties(false)
    .prop('graph_name', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+')),
}

export default function getComposedSchema(fastify: FastifyInstance) {
  fastify.get<RequestContext>('/schema/latest', { schema }, async (req, res) => {
    const graphRepository = new GraphRepository(fastify.knex)

    const graph = await graphRepository.findFirst({
      name: req.query.graph_name,
    })
    if (!graph) {
      throw InvalidGraphNameError(req.query.graph_name)
    }

    const serviceRepository = new ServiceRepository(fastify.knex)
    const schemaRepository = new SchemaRepository(fastify.knex)

    const serviceModels = await serviceRepository.findMany({
      graphName: req.query.graph_name,
    })
    if (serviceModels.length === 0) {
      return res.send({
        success: true,
        data: [],
      })
    }

    const allLatestServices = serviceModels.map((s) => ({
      name: s.name,
    }))

    const schmemaService = new SchemaService(serviceRepository, schemaRepository)

    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.query.graph_name,
      allLatestServices,
    )

    if (findError) {
      throw SchemaVersionLookupError(findError.message)
    }

    if (!schemas.length) {
      return res.send({
        success: true,
        data: [],
      })
    }

    const serviceSchemas = schemas.map((s) => ({
      name: s.serviceName,
      typeDefs: s.typeDefs,
    }))

    const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

    if (schemaError) {
      throw SchemaCompositionError(schemaError)
    }

    return {
      success: true,
      data: schemas,
    }
  })
}
