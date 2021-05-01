import { FastifyInstance } from 'fastify'
import basicAuth from '../core/basic-auth'
import garbageCollect from './garbage-collect'
import getComposedSchema from './get-composed-schema'
import getComposedSchemaVersions from './get-composed-schema-versions'
import getSchemaDiff from './get-schema-diff'
import getSchemaValidation from './get-schema-validation'
import listGraphs from './list-graphs'
import registerSchema from './register-schema'
import deactivateSchema from './deactivate-schema'
export interface registryOptions {
  basicAuthSecrets?: string
}

export default async function Registry(
  fastify: FastifyInstance,
  opts: registryOptions,
) {
  // Authentication, only valid in this scope
  fastify.register(basicAuth, {
    basicAuthSecrets: opts.basicAuthSecrets,
  })

  listGraphs(fastify)
  registerSchema(fastify)
  garbageCollect(fastify)
  getComposedSchema(fastify)
  getComposedSchemaVersions(fastify)
  deactivateSchema(fastify)
  getSchemaDiff(fastify)
  getSchemaValidation(fastify)
}
