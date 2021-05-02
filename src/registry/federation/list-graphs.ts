import { FastifyInstance } from 'fastify'

export default function listGraphs(fastify: FastifyInstance) {
  fastify.get('/graphs', async (req, res) => {
    const allGraphs = await fastify.prisma.graph.findMany()

    res.send({
      success: true,
      data: allGraphs.map((graph) => graph.name),
    })
  })
}
