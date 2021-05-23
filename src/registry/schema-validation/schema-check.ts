import S from 'fluent-json-schema'
import { FastifyInstance, FastifySchema } from 'fastify'
import { CriticalityLevel, diff } from '@graphql-inspector/core'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaManager } from '../../core/manager/SchemaManager'
import {
  InvalidGraphNameError,
  SchemaCompositionError,
  SchemaVersionLookupError,
} from '../../core/errors'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'
import { graphName, serviceName, typeDefs } from '../../core/shared-schemas'

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
      .required(['success', 'data'])
      .prop('success', S.boolean())
      .prop(
        'data',
        S.object()
          .prop('isBreaking', S.boolean())
          .prop(
            'report',
            S.array().items(
              S.object()
                .required(['type', 'message', 'level', 'path'])
                .prop('type', S.string())
                .prop('message', S.string())
                .prop('level', S.string())
                .prop('path', S.string())
                .prop('reason', S.string()),
            ),
          ),
      ),
  },
  body: S.object()
    .additionalProperties(false)
    .required(['typeDefs', 'serviceName', 'graphName'])
    .prop('graphName', graphName)
    .prop('typeDefs', typeDefs)
    .prop('serviceName', serviceName),
}

export default function schemaDiff(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/check', { schema }, async (req, res) => {
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

    const allLatestServices = serviceModels.map((s) => ({ name: s.name }))
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

    let original = composeAndValidateSchema(serviceSchemas)
    if (!original.schema) {
      throw SchemaCompositionError(original.error)
    }
    if (original.error) {
      throw SchemaCompositionError(original.error)
    }

    serviceSchemas = serviceSchemas
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

    const changes = diff(original.schema, updated.schema)

    const changesReport = []
    let isBreaking = false

    for (const change of changes) {
      if (change.criticality.level === CriticalityLevel.Breaking) {
        isBreaking = true
      }
      changesReport.push({
        type: change.type,
        message: change.message,
        level: change.criticality.level,
        path: change.path,
        reason: change.criticality.reason,
      })
    }

    return {
      success: true,
      data: {
        isBreaking,
        report: changesReport,
      },
    }
  })
}
