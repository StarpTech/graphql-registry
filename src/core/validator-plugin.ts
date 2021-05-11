import Ajv, { Ajv as AjvInstance } from 'ajv'
import fp from 'fastify-plugin'

declare module 'fastify' {
  interface FastifyInstance {
    ajv: AjvInstance
  }
}

export default fp(async function (fastify, opts) {
  const ajv = new Ajv({
    coerceTypes: true,
    useDefaults: true,
    removeAdditional: true,
    // Explicitly set allErrors to `false`.
    // When set to `true`, a DoS attack is possible.
    allErrors: false,
  })

  fastify.decorate('ajv', ajv)

  fastify.setValidatorCompiler(({ schema, method, url, httpPart }) => ajv.compile(schema))
})
