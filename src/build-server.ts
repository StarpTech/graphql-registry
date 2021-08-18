import Fastify from 'fastify'
import registryPlugin from './registry'
import health from './core/health'
import knexPlugin from './core/knex-plugin'
import validatorPlugin from './core/validator-plugin'
import { ErrorResponse } from './core/types'

export interface buildOptions {
  logger?: boolean
  databaseConnectionUrl: string
  databaseSchema?: string
  basicAuth?: string
  prettyPrint?: boolean
  jwtSecret?: string
}

export default function build(opts: buildOptions) {
  const fastify = Fastify({
    logger: opts.logger
      ? {
          prettyPrint: opts.prettyPrint,
        }
      : undefined,
  })

  // Custom ajv validator
  fastify.register(validatorPlugin)

  // Database client
  fastify.register(knexPlugin, {
    databaseConnectionUrl: opts.databaseConnectionUrl,
    databaseSchema: opts.databaseSchema,
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
    const result: ErrorResponse = {
      success: false,
    }
    // only expose error informations when it was intented for
    if (err.name === 'FastifyError') {
      result.error = err.message
    }

    reply.code(err.statusCode || 500).send(result)
  })

  return fastify
}
