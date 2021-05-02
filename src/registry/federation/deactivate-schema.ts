import S from 'fluent-json-schema'
import { FastifyInstance, FastifySchema } from 'fastify'
import { SchemaNotFoundError } from '../../core/errrors'

export interface RequestContext {
  Body: {
    schemaId: number
    graph_name: string
  }
}

export const schema: FastifySchema = {
  response: {
    '2xx': S.object().additionalProperties(false).required(['success']).prop('success', S.boolean()),
  },
  body: S.object().additionalProperties(false).required(['schemaId']).prop('schemaId', S.number().minimum(1)),
}

export default function deactivateSchema(fastify: FastifyInstance) {
  fastify.post<RequestContext>('/schema/deactivate', async (req, res) => {
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
