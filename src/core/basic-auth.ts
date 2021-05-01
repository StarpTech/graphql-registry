import fp from 'fastify-plugin'
import { FastifyReply, FastifyRequest } from 'fastify'
import basicAuth from 'fastify-basic-auth'
import { timingSafeEqual } from 'crypto'

export interface basicAuthOptions {
  basicAuthSecrets?: string
}

export default fp<basicAuthOptions>(async function BasicAuth (fastify, opts) {
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
        .find(
          (secret) =>
            timingSafeEqual(Buffer.from(secret), Buffer.from(username)) &&
            timingSafeEqual(Buffer.from(secret), Buffer.from(password)),
        )
    ) {
      throw new Error('Invalid credentials')
    }
  }

  fastify.register(basicAuth, {
    authenticate: { realm: 'GraphQL Registry' },
    validate,
  })

  fastify.after(() => {
    if (opts.basicAuthSecrets) {
      fastify.addHook('onRequest', fastify.basicAuth)
    }
  })
})
