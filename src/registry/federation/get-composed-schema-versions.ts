import { FastifyInstance, FastifySchema } from 'fastify'
import S from 'fluent-json-schema'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaResponseModel, SuccessResponse } from '../../core/types'
import { SchemaService } from '../../core/services/Schema'
import { InvalidGraphNameError, SchemaCompositionError, SchemaVersionLookupError } from '../../core/errrors'

interface ServiceVersionMatch {
  name: string
  version: string
}

export interface RequestContext {
  Body: {
    graph_name: string
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
            .prop('schemaId', S.number().minimum(1))
            .prop('version', S.string().minLength(1).maxLength(100))
            .prop('typeDefs', S.string().minLength(1).maxLength(10000))
            .prop('serviceName', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+')),
        ),
      ),
  },
  body: S.object()
    .additionalProperties(false)
    .required(['graph_name', 'services'])
    .prop('graph_name', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+'))
    .prop(
      'services',
      S.array()
        .minItems(1)
        .items(
          S.object()
            .required(['name'])
            .prop('version', S.string().minLength(1).maxLength(100))
            .prop('name', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+')),
        ),
    ),
}

export default function getComposedSchemaVersions(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/compose', { schema }, async (req, res) => {
    const graph = await fastify.prisma.graph.findFirst({
      where: {
        name: req.body.graph_name,
        isActive: true,
      },
    })
    if (!graph) {
      throw InvalidGraphNameError(req.body.graph_name)
    }

    const allServicesWithVersion: ServiceVersionMatch[] = req.body.services.map((s) => ({
      name: s.name,
      version: s.version,
    }))

    const schmemaService = new SchemaService(fastify.prisma)
    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.body.graph_name,
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
