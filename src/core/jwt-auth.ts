import fp from 'fastify-plugin'
import { FastifyReply, FastifyRequest } from 'fastify'
import jwtAuth from 'fastify-jwt'

export interface jwtAuthOptions {
  secret: string
}

declare module 'fastify-jwt' {
  interface FastifyJWT {
    payload: { services: string[] }
  }
}

export default fp<jwtAuthOptions>(async function JwtAuth(fastify, opts) {
  async function validate(req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify()
    } catch (err) {
      reply.send({
        success: false,
        error: err.toString(),
      })
    }
  }

  fastify.register(jwtAuth, {
    secret: opts.secret,
  })

  fastify.addHook('onRequest', validate)
})
