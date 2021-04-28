import { number, object, size, validate } from 'superstruct'
import { FastifyInstance } from 'fastify'

interface GarbageCollectRequest {
  num_schemas_keep: number
}

const garbageCollectRequest = object({
  num_schemas_keep: size(number(), 10, 100),
})

export default function garbageCollect(fastify: FastifyInstance) {
  fastify.post<{ Body: GarbageCollectRequest }>(
    '/schema/garbage_collect',
    async (req, res) => {
      const requestBody = req.body
      const [error, input] = validate(requestBody, garbageCollectRequest)
      if (!input || error) {
        res.code(400)
        return {
          success: false,
          error: error?.message,
        }
      }

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
    },
  )
}
