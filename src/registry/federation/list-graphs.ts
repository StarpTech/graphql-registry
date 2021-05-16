import { FastifyInstance, FastifySchema } from 'fastify'
import S from 'fluent-json-schema'
import { GraphDBModel } from '../../core/models/graphModel'
import { graphName } from '../../core/shared-schemas'

export const schema: FastifySchema = {
  response: {
    '2xx': S.object()
      .additionalProperties(false)
      .required(['success'])
      .prop('success', S.boolean())
      .prop('data', S.array().items(graphName)),
  },
}

export default function listGraphs(fastify: FastifyInstance) {
  fastify.get('/graphs', async (req, res) => {
    const allGraphs = await fastify.knex
      .select(GraphDBModel.fullName('name'))
      .from<GraphDBModel>(GraphDBModel.table)

    res.send({
      success: true,
      data: allGraphs.map((graph) => graph.name),
    })
  })
}
