import fp from 'fastify-plugin'

export default fp(async function Health (fastify, opts) {
  fastify.get('/health', (req, res) => {
    res.send()
  })
})
