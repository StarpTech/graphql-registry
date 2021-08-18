import fp from 'fastify-plugin'
import Knex from 'knex'

declare module 'fastify' {
  interface FastifyInstance {
    knex: Knex
    knexHealthcheck(): Promise<void>
  }
}

export interface KnexPluginOptions {
  databaseConnectionUrl: string
  databaseSchema?: string
}

export default fp<KnexPluginOptions>(async function (fastify, opts) {
  const connection = Knex({
    client: 'pg',
    log: {
      warn: fastify.log.warn,
      error: fastify.log.error,
      deprecate: fastify.log.info,
      debug: fastify.log.debug,
    },
    connection: opts.databaseConnectionUrl,
    searchPath: opts.databaseSchema,
  })

  fastify.decorate('knexHealthcheck', async () => {
    try {
      await connection.raw('SELECT NOW()')
    } catch (error) {
      fastify.log.error(error)
      throw new Error('Database connection healthcheck failed')
    }
  })
  fastify.addHook('onClose', () => connection.destroy())

  await fastify.knexHealthcheck()

  fastify.decorate('knex', connection)
})
