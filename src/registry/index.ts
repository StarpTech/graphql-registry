import { FastifyInstance } from 'fastify'
import basicAuth from '../core/basic-auth'
import garbageCollect from './maintanance/garbage-collect'
import getComposedSchema from './federation/get-composed-schema'
import getComposedSchemaVersions from './federation/get-composed-schema-versions'
import getSchemaDiff from './validation/get-schema-diff'
import getSchemaValidation from './validation/get-schema-validation'
import listGraphs from './federation/list-graphs'
import registerSchema from './federation/register-schema'
import deactivateSchema from './federation/deactivate-schema'
export interface registryOptions {
  basicAuthSecrets?: string
}

export default async function Registry(
  fastify: FastifyInstance,
  opts: registryOptions,
) {
  // Authentication, only valid in this register scope
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
