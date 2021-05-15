import fp from 'fastify-plugin'

export default fp(async function Health(fastify, opts) {
  fastify.get('/health', async (req, res) => {
    await fastify.knexHealthcheck()
    res.send()
  })
})
