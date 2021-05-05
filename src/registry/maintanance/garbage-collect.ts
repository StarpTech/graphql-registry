import S from 'fluent-json-schema'
import { FastifyInstance, FastifySchema } from 'fastify'

export interface RequestContext {
  Body: {
    num_schemas_keep: number
  }
}

export const schema: FastifySchema = {
  body: S.object()
    .additionalProperties(false)
    .required(['num_schemas_keep'])
    .prop('num_schemas_keep', S.number().minimum(10).maximum(100)),
}

export default function garbageCollect(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/garbage_collect', { schema }, async (req, res) => {
    return fastify.knex.transaction(async function (trx) {
      const schemasToKeep = await trx.from('schema').orderBy('updatedAt', 'desc').limit(req.body.num_schemas_keep)

      const deletedSchemaTags = await trx
        .from('schema_tag')
        .whereNotIn(
          `schema_tag.schemaId`,
          schemasToKeep.map((s) => s.id),
        )
        .delete()

      const deletedSchemas = await trx
        .from('schema')
        .whereNotIn(
          `schema.id`,
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
