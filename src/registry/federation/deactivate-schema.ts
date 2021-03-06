import S from 'fluent-json-schema'
import { FastifyInstance, FastifySchema } from 'fastify'
import { SchemaNotFoundError } from '../../core/errors'
import SchemaRepository from '../../core/repositories/SchemaRepository'
import { schemaId } from '../../core/shared-schemas'

export interface RequestContext {
  Body: {
    schemaId: number
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
  body: S.object().additionalProperties(false).required(['schemaId']).prop('schemaId', schemaId),
}

export default function deactivateSchema(fastify: FastifyInstance) {
  fastify.put<RequestContext>('/schema/deactivate', async (req, res) => {
    return fastify.knex.transaction(async function (trx) {
      const schemaRepository = new SchemaRepository(trx)
      const schema = await schemaRepository.findById(req.body.schemaId)

      if (!schema) {
        throw SchemaNotFoundError(req.body.schemaId)
      }

      await schemaRepository.updateById(schema.id, {
        ...schema,
        isActive: false,
      })

      return {
        success: true,
      }
    })
  })
}
