import { FastifyInstance, FastifySchema } from 'fastify'

interface DeactivateSchemaRequest {
  schemaId: number
  graph_name: string
}

export const schema: FastifySchema = {
  body: {
    type: 'object',
    required: ['schemaId', 'graph_name'],
    properties: {
      schemaId: { type: 'integer', minLength: 1 },
    },
  },
}

export default function deactivateSchema(fastify: FastifyInstance) {
  fastify.post<{ Body: DeactivateSchemaRequest }>(
    '/schema/deactivate',
    async (req, res) => {
      const schema = await fastify.prisma.schema.findFirst({
        where: {
          isActive: true,
          id: req.body.schemaId,
        },
      })

      if (!schema) {
        res.code(400)
        return {
          success: false,
          error: `Could not find schema with id "${req.body.schemaId}"`,
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
