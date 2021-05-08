import S from 'fluent-json-schema'
import fp from 'fastify-plugin'
import { FastifyReply, FastifyRequest } from 'fastify'
import jwtAuth from 'fastify-jwt'

export interface jwtAuthOptions {
  secret: string
}

export interface JwtPayload {
  services: string[]
  client: string
}

declare module 'fastify-jwt' {
  interface FastifyJWT {
    payload: JwtPayload
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
    trusted: validateToken,
  })

  async function validateToken(req: FastifyRequest, decodedToken: any) {
    if (!decodedToken.client || !Array.isArray(decodedToken.services)) {
      return false
    }
    return true
  }

  fastify.addHook('onRequest', validate)
})
