import Fastify from 'fastify'
import registryPlugin from './registry'
import prismaPlugin from './core/prisma-plugin'
import health from './core/health'

export interface buildOptions {
  databaseConnectionUrl: string
  basicAuth?: string
  jwtSecret?: string
}

export default function build(opts: buildOptions) {
  const fastify = Fastify()

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

  return fastify
}
