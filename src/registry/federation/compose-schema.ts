import S from 'fluent-json-schema'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaManager } from '../../core/manager/SchemaManager'
import { FastifyInstance, FastifySchema } from 'fastify'
import {
  InvalidGraphNameError,
  SchemaCompositionError,
  SchemaVersionLookupError,
} from '../../core/errors'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'
import { graphName, schemaId, serviceName, typeDefs, version } from '../../core/shared-schemas'

export interface RequestContext {
  Querystring: {
    graphName: string
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
            .prop('schemaId', schemaId)
            .prop('version', version)
            .prop('typeDefs', typeDefs)
            .prop('serviceName', serviceName),
        ),
      ),
  },
  querystring: S.object()
    .required(['graphName'])
    .additionalProperties(false)
    .prop('graphName', graphName),
}

export default function composeSchema(fastify: FastifyInstance) {
  fastify.get<RequestContext>('/schema/latest', { schema }, async (req, res) => {
    const graphRepository = new GraphRepository(fastify.knex)

    const graphExists = await graphRepository.exists({
      name: req.query.graphName,
    })
    if (!graphExists) {
      throw InvalidGraphNameError(req.query.graphName)
    }

    const serviceRepository = new ServiceRepository(fastify.knex)
    const schemaRepository = new SchemaRepository(fastify.knex)

    const serviceModels = await serviceRepository.findMany({
      graphName: req.query.graphName,
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

    const schmemaService = new SchemaManager(serviceRepository, schemaRepository)

    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.query.graphName,
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
