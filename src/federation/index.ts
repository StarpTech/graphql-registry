import fp from 'fastify-plugin'
import garbageCollect from './garbage-collect'
import getComposedSchema from './get-composed-schema'
import getSchemaDiff from './get-schema-diff'
import getSchemaValidation from './get-schema-validation'
import listGraphs from './list-graphs'
import registerSchema from './register-schema'

export interface federationOptions {
  basicAuthSecrets?: string
}

export default fp<federationOptions>(async function (fastify, opts) {
  if (opts.basicAuthSecrets) {
    fastify.addHook('onRequest', fastify.basicAuth)
  }
  listGraphs(fastify)
  registerSchema(fastify)
  garbageCollect(fastify)
  getComposedSchema(fastify)
  getSchemaDiff(fastify)
  getSchemaValidation(fastify)
})
