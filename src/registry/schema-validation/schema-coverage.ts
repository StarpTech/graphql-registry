import S from 'fluent-json-schema'
import { FastifyInstance, FastifySchema } from 'fastify'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaManager, ServiceSchemaVersionMatch } from '../../core/manager/SchemaManager'
import {
  InvalidGraphNameError,
  SchemaCompositionError,
  SchemaVersionLookupError,
} from '../../core/errors'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'
import { graphName, serviceName, version } from '../../core/shared-schemas'
import { getSchemaCoverage } from '../../core/graphql-utils'
import { Source } from 'graphql'
import { ServiceVersionMatch } from '../../core/types'

export interface RequestContext {
  Body: {
    graphName: string
    services?: ServiceVersionMatch[]
    documents: {
      name: string
      source: string
    }[]
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
          .prop('sources', S.array().items(S.object().additionalProperties(true)))
          .prop('types', S.object().additionalProperties(true)),
      ),
  },
  body: S.object()
    .additionalProperties(false)
    .required(['documents', 'graphName'])
    .prop('graphName', graphName)
    .prop(
      'documents',
      S.array().items(
        S.object().required(['name', 'source']).prop('name', S.string()).prop('source', S.string()),
      ),
    )
    .prop(
      'services',
      S.array()
        .minItems(1)
        .items(
          S.object()
            .required(['name', 'version'])
            .prop('version', version)
            .prop('name', serviceName),
        ),
    ),
}

export default function schemaCoverage(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/coverage', { schema }, async (req, res) => {
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
      return res.send({
        success: true,
        data: {},
      })
    }

    let serviceVersionMatches: ServiceSchemaVersionMatch[] = []

    if (req.body.services && req.body.services?.length > 0) {
      serviceVersionMatches = req.body.services.map((s) => ({
        name: s.name,
        version: s.version,
      }))
    } else {
      serviceVersionMatches = serviceModels.map((s) => ({ name: s.name }))
    }

    const schmemaService = new SchemaManager(serviceRepository, schemaRepository)
    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.body.graphName,
      serviceVersionMatches,
    )

    if (findError) {
      throw SchemaVersionLookupError(findError.message)
    }

    let serviceSchemas = schemas.map((s) => ({
      name: s.serviceName,
      url: s.routingUrl,
      typeDefs: s.typeDefs,
    }))

    let compositionResult = composeAndValidateSchema(serviceSchemas)
    if (compositionResult.error) {
      throw SchemaCompositionError(compositionResult.error)
    }
    if (!compositionResult.schema) {
      throw SchemaCompositionError(compositionResult.error)
    }

    const sources = req.body.documents.map((document) => new Source(document.source, document.name))
    const changesReport = getSchemaCoverage(compositionResult.schema, sources)

    return {
      success: true,
      data: changesReport,
    }
  })
}
