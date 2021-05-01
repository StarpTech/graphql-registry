import { FastifyInstance, FastifySchema } from 'fastify'

interface GarbageCollectRequest {
  num_schemas_keep: number
}

export const schema: FastifySchema = {
  body: {
    type: 'object',
    required: ['num_schemas_keep'],
    properties: {
      num_schemas_keep: { type: 'integer', minimum: 10, maximum: 100 },
    },
  },
}

export default function garbageCollect(fastify: FastifyInstance) {
  fastify.post<{ Body: GarbageCollectRequest }>('/schema/garbage_collect', { schema }, async (req, res) => {
    const schemasToKeep = await fastify.prisma.schema.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      take: 10,
    })

    const deletedVersions = await fastify.prisma.schemaVersion.deleteMany({
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
