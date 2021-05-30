import S from 'fluent-json-schema'
import { FastifyInstance, FastifySchema } from 'fastify'
import { SchemaDBModel } from '../../core/models/schemaModel'
import { SchemaTagDBModel } from '../../core/models/schemaTagModel'

export interface RequestContext {
  Body: {
    numSchemasKeep: number
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
          .required(['deletedSchemas', 'deletedVersions'])
          .prop('deletedSchemas', S.number())
          .prop('deletedVersions', S.number()),
      ),
  },
  body: S.object()
    .additionalProperties(false)
    .required(['numSchemasKeep'])
    .prop('numSchemasKeep', S.number().minimum(10).maximum(100)),
}

export default function garbageCollect(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/garbage_collect', { schema }, async (req, res) => {
    return fastify.knex.transaction(async function (trx) {
      const schemasToKeep = await trx
        .from(`${SchemaDBModel.table}`)
        .orderBy(SchemaDBModel.field('updatedAt'), 'desc')
        .limit(req.body.numSchemasKeep)

      const deletedSchemaTags = await trx
        .from(`${SchemaTagDBModel.table}`)
        .whereNotIn(
          `${SchemaTagDBModel.field('schemaId')}`,
          schemasToKeep.map((s) => s.id),
        )
        .delete()

      const deletedSchemas = await trx
        .from(`${SchemaDBModel.table}`)
        .whereNotIn(
          `${SchemaDBModel.field('id')}`,
          schemasToKeep.map((s) => s.id),
        )
        .delete()

      return {
        success: true,
        data: {
          deletedSchemas: deletedSchemas,
          deletedVersions: deletedSchemaTags,
        },
      }
    })
  })
}
