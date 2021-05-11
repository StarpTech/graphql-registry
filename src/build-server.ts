import Fastify from 'fastify'
import registryPlugin from './registry'
import health from './core/health'
import knexPlugin from './core/knex-plugin'
import validatorPlugin from './core/validator-plugin'

export interface buildOptions {
  logger?: boolean
  databaseConnectionUrl: string
  basicAuth?: string
  jwtSecret?: string
}

export default function build(opts: buildOptions) {
  const fastify = Fastify({
    logger: opts.logger,
  })

  // Custom ajv validator
  fastify.register(validatorPlugin)

  // Database client
  fastify.register(knexPlugin, {
    databaseConnectionUrl: opts.databaseConnectionUrl,
  })

  // Registry
  fastify.register(registryPlugin, {
    basicAuth: opts.basicAuth,
    jwtSecret: opts.jwtSecret,
  })

  // Health check
  fastify.register(health)

  fastify.setErrorHandler(function (err, request, reply) {
    this.log.error(err)
    if (err.validation) {
      reply.code(400)
      reply.send({
        success: false,
        error: err.message,
      })
      return
    }
    reply.code(err.statusCode || 500)
    reply.send({
      success: false,
      error: err.message,
    })
  })

  return fastify
}
