import S from 'fluent-json-schema'
import { Source, print, parse } from 'graphql'
import { FastifyInstance, FastifySchema } from 'fastify'
import { validate as validateDocument } from '@graphql-inspector/core'
import {
  InvalidDocumentError,
  InvalidGraphNameError,
  SchemaCompositionError,
  SchemaVersionLookupError,
} from '../../core/errors'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaManager } from '../../core/manager/SchemaManager'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'
import { document, graphName } from '../../core/shared-schemas'

export interface RequestContext {
  Body: {
    document: string
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
    .required(['document', 'graphName'])
    .prop('graphName', graphName)
    .prop('document', document),
}

export default function documentValidation(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/document/validate', { schema }, async (req, res) => {
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
      return {
        success: true,
      }
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

    let serviceSchemas = schemas.map((s) => ({
      name: s.serviceName,
      typeDefs: s.typeDefs,
    }))

    const updated = composeAndValidateSchema(serviceSchemas)
    if (!updated.schema) {
      throw SchemaCompositionError(updated.error)
    }
    if (updated.error) {
      throw SchemaCompositionError(updated.error)
    }

    let doc = null
    try {
      doc = parse(req.body.document)
    } catch {
      throw InvalidDocumentError()
    }

    const invalidDocuments = validateDocument(updated.schema, [new Source(print(doc))], {
      apollo: true,
      strictDeprecated: true,
      maxDepth: 10,
      keepClientFields: true,
    })

    if (invalidDocuments.length > 0) {
      res.code(400)
      return {
        success: false,
        error: invalidDocuments,
      }
    }

    return {
      success: true,
    }
  })
}
