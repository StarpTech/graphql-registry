import { FastifyInstance } from 'fastify'
import basicAuth from '../core/basic-auth'
import garbageCollect from './maintanance/garbage-collect'
import composeSchema from './federation/compose-schema'
import composeSchemaVersions from './federation/compose-schema-versions'
import schemaCheck from './schema-validation/schema-check'
import schemaValidation from './schema-validation/schema-validation'
import listGraphs from './federation/list-graphs'
import registerSchema from './federation/register-schema'
import deactivateSchema from './federation/deactivate-schema'
import jwtAuth from '../core/jwt-auth'
import documentValidation from './document-validation/document-validation'
import supergraphSchema from './federation/supergraph-schema'
import schemaCoverage from './schema-validation/schema-coverage'
export interface registryOptions {
  basicAuth?: string
  jwtSecret?: string
}

export default async function Registry(fastify: FastifyInstance, opts: registryOptions) {
  // Authentication, only valid in this register scope
  if (opts.basicAuth) {
    fastify.register(basicAuth, {
      basicAuthSecrets: opts.basicAuth,
    })
  } else if (opts.jwtSecret) {
    fastify.register(jwtAuth, {
      secret: opts.jwtSecret,
    })
  }

  fastify.after(() => {
    if (opts.basicAuth) {
      fastify.addHook('onRequest', fastify.basicAuth)
    }
  })

  documentValidation(fastify)
  listGraphs(fastify)
  registerSchema(fastify)
  schemaCoverage(fastify)
  garbageCollect(fastify)
  supergraphSchema(fastify)
  composeSchema(fastify)
  composeSchemaVersions(fastify)
  deactivateSchema(fastify)
  schemaCheck(fastify)
  schemaValidation(fastify)
}
