import { FastifyInstance, FastifySchema } from 'fastify'
import S from 'fluent-json-schema'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaResponseModel, SuccessResponse } from '../../core/types'
import { SchemaManager } from '../../core/manager/SchemaManager'
import {
  InvalidGraphNameError,
  SchemaCompositionError,
  SchemaVersionLookupError,
} from '../../core/errors'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'
import { graphName, schemaId, serviceName, typeDefs, version } from '../../core/shared-schemas'

interface ServiceVersionMatch {
  name: string
  version: string
}

export interface RequestContext {
  Body: {
    graphName: string
    services: ServiceVersionMatch[]
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
  body: S.object()
    .additionalProperties(false)
    .required(['graphName', 'services'])
    .prop('graphName', graphName)
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

export default function composeSchemaVersions(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/compose', { schema }, async (req, res) => {
    const graphRepository = new GraphRepository(fastify.knex)

    const graphExists = await graphRepository.exists({
      name: req.body.graphName,
    })

    if (!graphExists) {
      throw InvalidGraphNameError(req.body.graphName)
    }

    const serviceRepository = new ServiceRepository(fastify.knex)
    const schemaRepository = new SchemaRepository(fastify.knex)

    const allServicesWithVersion: ServiceVersionMatch[] = req.body.services.map((s) => ({
      name: s.name,
      version: s.version,
    }))

    const schmemaService = new SchemaManager(serviceRepository, schemaRepository)
    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.body.graphName,
      allServicesWithVersion,
    )

    if (findError) {
      throw SchemaVersionLookupError(findError.message)
    }

    const serviceSchemas = schemas.map((s) => ({
      name: s.serviceName,
      typeDefs: s.typeDefs,
    }))

    const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

    if (schemaError) {
      throw SchemaCompositionError(schemaError)
    }

    const responseBody: SuccessResponse<SchemaResponseModel[]> = {
      success: true,
      data: schemas,
    }

    return responseBody
  })
}
