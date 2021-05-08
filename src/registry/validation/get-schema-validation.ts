import S from 'fluent-json-schema'
import { FastifyInstance, FastifySchema } from 'fastify'
import {
  InvalidGraphNameError,
  SchemaCompositionError,
  SchemaVersionLookupError,
} from '../../core/errrors'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaManager } from '../../core/manager/SchemaManager'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'

export interface RequestContext {
  Body: {
    serviceName: string
    typeDefs: string
    graphName: string
  }
}

export const schema: FastifySchema = {
  response: {
    '2xx': S.object()
      .additionalProperties(false)
      .required(['success'])
      .prop('success', S.boolean()),
  },
  body: S.object()
    .additionalProperties(false)
    .required(['typeDefs', 'serviceName', 'graphName'])
    .prop('graphName', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+'))
    .prop('typeDefs', S.string().minLength(1).maxLength(10000))
    .prop('serviceName', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+')),
}

export default function getSchemaValidation(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/validate', { schema }, async (req, res) => {
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
        data: [],
      })
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

    let serviceSchemas = schemas
      .map((s) => ({
        name: s.serviceName,
        typeDefs: s.typeDefs,
      }))
      .filter((schema) => schema.name !== req.body.serviceName)
      .concat({
        name: req.body.serviceName,
        typeDefs: req.body.typeDefs,
      })

    const updated = composeAndValidateSchema(serviceSchemas)
    if (!updated.schema) {
      throw SchemaCompositionError(updated.error)
    }
    if (updated.error) {
      throw SchemaCompositionError(updated.error)
    }

    return {
      success: true,
    }
  })
}
