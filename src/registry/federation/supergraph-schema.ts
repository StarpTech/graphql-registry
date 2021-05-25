import S from 'fluent-json-schema'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaManager } from '../../core/manager/SchemaManager'
import { FastifyInstance, FastifySchema } from 'fastify'
import {
  InvalidGraphNameError,
  SchemaCompositionError,
  SchemaVersionLookupError,
  SupergraphCompositionError,
} from '../../core/errors'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'
import { graphName } from '../../core/shared-schemas'
import { hash } from '../../core/util'

export interface RequestContext {
  Body: {
    graphName: string
    federation: boolean
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
          .required(['supergraphSdl', 'compositionId'])
          .prop('supergraphSdl', S.string())
          .prop('compositionId', S.string()),
      ),
  },
  body: S.object().additionalProperties(false).required(['graphName']).prop('graphName', graphName),
}

export default function supergraphSchema(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/supergraph', { schema }, async (req, res) => {
    const graphRepository = new GraphRepository(fastify.knex)

    const graphExists = await graphRepository.exists({
      name: req.body.graphName,
    })
    if (!graphExists) {
      throw InvalidGraphNameError(req.body.graphName)
    }

    const serviceRepository = new ServiceRepository(fastify.knex)
    const schemaRepository = new SchemaRepository(fastify.knex)

    const serviceModels = await serviceRepository.findMany({
      graphName: req.body.graphName,
    })
    if (serviceModels.length === 0) {
      throw SupergraphCompositionError(`Can't compose supergraph. No service is registered.`)
    }

    const servicesWithoutRoutingUrl = serviceModels.filter((service) => !service.routingUrl)
    if (servicesWithoutRoutingUrl.length > 0) {
      throw SupergraphCompositionError(
        `Can't compose supergraph. Service '${servicesWithoutRoutingUrl[0].name}' has no routingUrl.`,
      )
    }

    const allLatestServices = serviceModels.map((s) => ({
      name: s.name,
    }))

    const schmemaService = new SchemaManager(serviceRepository, schemaRepository)

    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.body.graphName,
      allLatestServices,
    )

    if (findError) {
      throw SchemaVersionLookupError(findError.message)
    }

    if (!schemas.length) {
      return res.send({
        success: true,
        data: {},
      })
    }

    const serviceSchemas = schemas.map((s) => ({
      name: s.serviceName,
      url: s.routingUrl,
      typeDefs: s.typeDefs,
    }))

    const { error: schemaError, supergraphSdl } = composeAndValidateSchema(serviceSchemas)

    if (schemaError) {
      throw SchemaCompositionError(schemaError)
    }

    if (!supergraphSdl) {
      throw SupergraphCompositionError(schemaError)
    }

    return {
      success: true,
      data: {
        supergraphSdl,
        compositionId: hash(supergraphSdl),
      },
    }
  })
}
