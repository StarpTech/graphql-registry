import { FastifyInstance, FastifySchema } from 'fastify'
import { SchemaNotFoundError } from '../../core/errrors'

interface DeactivateSchemaRequest {
  schemaId: number
  graph_name: string
}

export const schema: FastifySchema = {
  body: {
    type: 'object',
    required: ['schemaId', 'graph_name'],
    properties: {
      schemaId: { type: 'integer', minimum: 1 },
    },
  },
}

export default function deactivateSchema(fastify: FastifyInstance) {
  fastify.post<{ Body: DeactivateSchemaRequest }>('/schema/deactivate', async (req, res) => {
    const schema = await fastify.prisma.schema.findFirst({
      where: {
        isActive: true,
        id: req.body.schemaId,
      },
    })

    if (!schema) {
      throw SchemaNotFoundError(req.body.schemaId)
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
  })
}
