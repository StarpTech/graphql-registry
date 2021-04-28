import { PrismaClient } from '.prisma/client'
import { FastifyInstance } from 'fastify'
import {
  min,
  number,
  object,
  pattern,
  size,
  string,
  validate,
} from 'superstruct'

interface DeactivateSchemaRequest {
  schemaId: string
  graph_name: string
}

const deactivateRequest = object({
  schemaId: min(number(), 1),
  graph_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
})

declare module 'fastify' {
  interface FastifyInstance {
    // you must reference the interface and not the type
    prisma: PrismaClient
  }
}

export default function registerSchema(fastify: FastifyInstance) {
  fastify.post<{ Body: DeactivateSchemaRequest }>(
    '/schema/deactivate',
    async (req, res) => {
      const requestBody = req.body
      const [error, input] = validate(requestBody, deactivateRequest)
      if (!input || error) {
        res.code(400)
        return {
          success: false,
          error: error?.message,
        }
      }

      const graph = await fastify.prisma.graph.findFirst({
        where: {
          isActive: true,
          name: input.graph_name,
        },
      })
      if (!graph) {
        res.code(404)
        return {
          success: false,
          error: `Graph with name "${input.graph_name}" does not exist`,
        }
      }

      const schema = await fastify.prisma.schema.findFirst({
        where: {
          isActive: true,
          id: input.schemaId,
        },
      })

      if (!schema) {
        res.code(400)
        return {
          success: false,
          error: 'Could not find schema',
        }
      }

      await fastify.prisma.schema.update({
        data: {
          ...schema,
          isActive: false,
        },
        where: {
          id: schema.id,
        },
      })

      return {
        success: true,
      }
    },
  )
}
