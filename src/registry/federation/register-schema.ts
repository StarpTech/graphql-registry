import S from 'fluent-json-schema'
import { SchemaManager } from '../../core/manager/SchemaManager'
import { composeAndValidateSchema } from '../../core/federation'
import { SchemaResponseModel, SuccessResponse } from '../../core/types'
import { FastifyInstance, FastifySchema } from 'fastify'
import { SchemaCompositionError, SchemaVersionLookupError } from '../../core/errors'
import { checkUserServiceScope } from '../../core/hook-handler/user-scope.prevalidation'
import ServiceRepository from '../../core/repositories/ServiceRepository'
import GraphRepository from '../../core/repositories/GraphRepository'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import SchemaTagRepository from '../../core/repositories/SchemaTagRepository'
import { SchemaTagDBModel } from '../../core/models/schemaTagModel'
import { CURRENT_VERSION } from '../../core/constants'
import { normalize } from '../../core/graphql-utils'
import {
  dateTime,
  graphName,
  routingUrl,
  schemaId,
  serviceName,
  typeDefs,
  version,
} from '../../core/shared-schemas'

export interface RequestContext {
  Body: {
    serviceName: string
    version: string
    typeDefs: string
    graphName: string
    routingUrl: string
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
          .required(['version', 'typeDefs', 'serviceName', 'schemaId'])
          .prop('schemaId', schemaId)
          .prop('version', version)
          .prop('typeDefs', typeDefs)
          .prop('serviceName', serviceName)
          .prop('routingUrl', routingUrl)
          .prop('lastUpdatedAt', dateTime),
      ),
  },
  body: S.object()
    .additionalProperties(false)
    .required(['version', 'typeDefs', 'serviceName', 'graphName'])
    .prop('graphName', graphName)
    .prop('version', version.default(CURRENT_VERSION))
    .prop('typeDefs', typeDefs)
    .prop('serviceName', serviceName)
    .prop('routingUrl', routingUrl),
}

export default function registerSchema(fastify: FastifyInstance) {
  fastify.post<RequestContext>(
    '/schema/push',
    { schema, preValidation: checkUserServiceScope },
    async (req, res) => {
      return fastify.knex.transaction(async function (trx) {
        const serviceRepository = new ServiceRepository(trx)
        const schemaRepository = new SchemaRepository(trx)
        const graphRepository = new GraphRepository(trx)
        const schemaTagRepository = new SchemaTagRepository(trx)

        const serviceModels = await serviceRepository.findManyExceptWithName(
          {
            graphName: req.body.graphName,
          },
          req.body.serviceName,
        )

        const allLatestServices = serviceModels.map((s) => ({ name: s.name }))
        const schmemaService = new SchemaManager(serviceRepository, schemaRepository)
        const { schemas, error: findError } = await schmemaService.findByServiceVersions(
          req.body.graphName,
          allLatestServices,
        )

        if (findError) {
          throw SchemaVersionLookupError(findError.message)
        }

        const serviceSchemas = schemas.map((s) => ({
          name: s.serviceName,
          typeDefs: s.typeDefs,
        }))
        // Add the new schema to validate it against the current registry state before creating.
        serviceSchemas.push({
          name: req.body.serviceName,
          typeDefs: req.body.typeDefs,
        })

        const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

        if (schemaError) {
          throw SchemaCompositionError(schemaError)
        }

        /**
         * Create new graph
         */

        let graph = await graphRepository.findFirst({
          name: req.body.graphName,
        })

        if (!graph) {
          graph = await graphRepository.create({ name: req.body.graphName })
        }

        /**
         * Create new service
         */

        let service = await serviceRepository.findFirst({
          graphName: req.body.graphName,
          name: req.body.serviceName,
        })

        if (!service) {
          service = await serviceRepository.create({
            name: req.body.serviceName,
            graphId: graph.id,
            routingUrl: req.body.routingUrl,
          })
        } else if (req.body.routingUrl && req.body.routingUrl !== service.routingUrl) {
          const updatedService = await serviceRepository.updateOne(
            {
              routingUrl: req.body.routingUrl,
            },
            {
              id: service.id,
            },
          )
          service = updatedService!
        }

        const mormalizedTypeDefs = normalize(req.body.typeDefs)

        /**
         * Create new schema
         */

        let schema = await schemaRepository.findFirst({
          graphName: req.body.graphName,
          serviceName: req.body.serviceName,
          typeDefs: mormalizedTypeDefs,
        })

        if (!schema) {
          schema = await schemaRepository.create({
            graphId: graph.id,
            serviceId: service.id,
            typeDefs: mormalizedTypeDefs,
          })
        } else {
          const updatedSchema = await schemaRepository.updateById(schema.id, {
            updatedAt: new Date(),
          })
          schema = updatedSchema!
        }

        let schemaTag: SchemaTagDBModel | undefined
        /**
         * "current" always points to the latest registered schema of the service
         */
        if (req.body.version === CURRENT_VERSION) {
          schemaTag = await schemaTagRepository.findFirst({
            version: req.body.version,
            serviceId: service.id,
          })
          if (schemaTag) {
            await schemaTagRepository.update(
              {
                schemaId: schema.id,
              },
              {
                serviceId: service.id,
                version: req.body.version,
              },
            )
          }
        } else {
          schemaTag = await schemaTagRepository.findFirst({
            version: req.body.version,
            schemaId: schema.id,
            serviceId: service.id,
          })
        }

        /**
         * Create new schema tag
         */
        if (!schemaTag) {
          schemaTag = await schemaTagRepository.create({
            serviceId: service.id,
            version: req.body.version,
            schemaId: schema.id,
          })
        }

        const responseBody: SuccessResponse<SchemaResponseModel> = {
          success: true,
          data: {
            schemaId: schema.id,
            serviceName: req.body.serviceName,
            typeDefs: schema.typeDefs,
            version: schemaTag.version,
            routingUrl: service.routingUrl,
            lastUpdatedAt: schema.updatedAt,
          },
        }

        return responseBody
      })
    },
  )
}
