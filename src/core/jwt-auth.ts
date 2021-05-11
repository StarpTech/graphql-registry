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

const payloadSchema = S.object()
  .additionalProperties(false)
  .required(['services', 'client'])
  .prop('services', S.array().items(S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+')))
  .prop('client', S.string().minLength(1).pattern('[a-zA-Z_\\-0-9]+'))

declare module 'fastify-jwt' {
  interface FastifyJWT {
    payload: JwtPayload
  }
}

export default fp<jwtAuthOptions>(async function JwtAuth(fastify, opts) {
  const payloadSchemavalidator = fastify.ajv.compile(payloadSchema.valueOf())

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
    return payloadSchemavalidator(decodedToken)
  }

  fastify.addHook('onRequest', validate)
})
