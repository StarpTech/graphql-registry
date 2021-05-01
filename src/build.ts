import Fastify, { FastifyReply, FastifyRequest } from 'fastify'
import federationPlugin from './federation'
import prismaPlugin from './core/prisma-plugin'
import basicAuth from 'fastify-basic-auth'
import health from './health'

export interface buildOptions {
  databaseConnectionUrl: string
  basicAuthSecrets?: string
}

export default function build(opts: buildOptions) {
  const fastify = Fastify()

  async function validate(
    username: string,
    password: string,
    req: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (
      !opts.basicAuthSecrets ||
      !opts.basicAuthSecrets
        .trim()
        .split(',')
        .find((secret) => secret === username && secret === password)
    ) {
      throw new Error('Invalid credentials')
    }
  }

  fastify.register(basicAuth, {
    authenticate: { realm: 'GraphQL Registry' },
    validate,
  })
  fastify.register(prismaPlugin, {
    databaseConnectionUrl: opts.databaseConnectionUrl,
  })

  // Federation
  fastify.register(federationPlugin, {
    basicAuthSecrets: opts.basicAuthSecrets,
  })

  // Health check
  fastify.register(health)

  return fastify
}
