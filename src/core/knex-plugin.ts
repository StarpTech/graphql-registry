import fp from 'fastify-plugin'
import knex, { Knex } from 'knex'

declare module 'fastify' {
  interface FastifyInstance {
    knex: Knex
  }
}

export interface KnexPluginOptions {
  databaseConnectionUrl: string
}

export default fp<KnexPluginOptions>(async function (fastify, opts) {
  const connection = knex({
    client: 'pg',
    log: {
      warn: fastify.log.warn,
      error: fastify.log.error,
      deprecate: fastify.log.info,
      debug: fastify.log.debug,
    },
    connection: opts.databaseConnectionUrl,
  })

  fastify.addHook('onClose', () => connection.destroy())

  try {
    await connection.raw('SELECT 1')
  } catch (err) {
    fastify.log.error(err)
    throw err
  }

  fastify.decorate('knex', connection)
})
