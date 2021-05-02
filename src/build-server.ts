import Fastify from 'fastify'
import registryPlugin from './registry'
import prismaPlugin from './core/prisma-plugin'
import health from './core/health'

export interface buildOptions {
  logger?: boolean
  databaseConnectionUrl: string
  basicAuth?: string
  jwtSecret?: string
}

export default function build(opts: buildOptions) {
  const fastify = Fastify({
    logger: opts.logger
  })

  // Database client
  fastify.register(prismaPlugin, {
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
