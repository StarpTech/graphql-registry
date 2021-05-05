import S from 'fluent-json-schema'
import { FastifyInstance, FastifySchema } from 'fastify'
import { diff } from '@graphql-inspector/core'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaService } from '../../core/services/SchemaService'
import { InvalidGraphNameError, SchemaCompositionError, SchemaVersionLookupError } from '../../core/errrors'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'
export interface RequestContext {
  Body: {
    service_name: string
    type_defs: string
    graph_name: string
  }
}

export const schema: FastifySchema = {
  body: S.object()
    .additionalProperties(false)
    .required(['type_defs', 'service_name', 'graph_name'])
    .prop('graph_name', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+'))
    .prop('type_defs', S.string().minLength(1).maxLength(10000))
    .prop('service_name', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+')),
}

export default function getSchemaDiff(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/diff', { schema }, async (req, res) => {
    const graphRepository = new GraphRepository(fastify.knex)

    const graph = await graphRepository.findFirst({
      name: req.body.graph_name,
    })
    if (!graph) {
      throw InvalidGraphNameError(req.body.graph_name)
    }

    const serviceRepository = new ServiceRepository(fastify.knex)
    const schemaRepository = new SchemaRepository(fastify.knex)

    const serviceModels = await serviceRepository.findMany({
      graphName: req.body.graph_name,
    })

    if (serviceModels.length === 0) {
      return res.send({
        success: true,
        data: [],
      })
    }

    const allLatestServices = serviceModels.map((s) => ({ name: s.name }))
    const schmemaService = new SchemaService(serviceRepository, schemaRepository)
    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.body.graph_name,
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
      .filter((schema) => schema.name !== req.body.service_name)
      .concat({
        name: req.body.service_name,
        typeDefs: req.body.type_defs,
      })

    const updated = composeAndValidateSchema(serviceSchemas)
    if (!updated.schema) {
      throw SchemaCompositionError(updated.error)
    }
    if (updated.error) {
      throw SchemaCompositionError(updated.error)
    }

    const result = diff(original.schema, updated.schema)

    return {
      success: true,
      data: result,
    }
  })
}
