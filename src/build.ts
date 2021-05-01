import Fastify from 'fastify'
import registryPlugin from './registry'
import prismaPlugin from './core/prisma-plugin'
import health from './core/health'

export interface buildOptions {
  databaseConnectionUrl: string
  basicAuthSecrets?: string
}

export default function build(opts: buildOptions) {
  const fastify = Fastify()

  // Database client
  fastify.register(prismaPlugin, {
    databaseConnectionUrl: opts.databaseConnectionUrl,
  })

  // Registrya
  fastify.register(registryPlugin, {
    basicAuthSecrets: opts.basicAuthSecrets,
  })

  // Health check
  fastify.register(health)

  return fastify
}
