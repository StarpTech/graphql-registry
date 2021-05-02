import S from 'fluent-json-schema'
import { FastifyInstance, FastifySchema } from 'fastify'

interface GarbageCollectRequest {
  num_schemas_keep: number
}

export const schema: FastifySchema = {
  body: S.object()
    .additionalProperties(false)
    .required(['num_schemas_keep'])
    .prop('num_schemas_keep', S.number().minimum(10).maximum(100)),
}

export default function garbageCollect(fastify: FastifyInstance) {
  fastify.post<{ Body: GarbageCollectRequest }>('/schema/garbage_collect', { schema }, async (req, res) => {
    const schemasToKeep = await fastify.prisma.schema.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    })

    const deletedVersions = await fastify.prisma.schemaTag.deleteMany({
      where: {
        schema: {
          NOT: {
            id: {
              in: schemasToKeep.map((s) => s.id),
            },
          },
        },
      },
    })

    const deletedSchemas = await fastify.prisma.schema.deleteMany({
      where: {
        NOT: {
          id: {
            in: schemasToKeep.map((s) => s.id),
          },
        },
      },
    })

    return {
      success: true,
      data: {
        deletedSchemas: deletedSchemas.count,
        deletedVersions: deletedVersions.count,
      },
    }
  })
}
