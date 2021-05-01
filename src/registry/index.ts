import { FastifyInstance } from 'fastify'
import fastifyEnv from 'fastify-env'
import basicAuth from '../core/basic-auth'
import garbageCollect from './maintanance/garbage-collect'
import getComposedSchema from './federation/get-composed-schema'
import getComposedSchemaVersions from './federation/get-composed-schema-versions'
import getSchemaDiff from './validation/get-schema-diff'
import getSchemaValidation from './validation/get-schema-validation'
import listGraphs from './federation/list-graphs'
import registerSchema from './federation/register-schema'
import deactivateSchema from './federation/deactivate-schema'
import jwtAuth from '../core/jwt-auth'
import envSchema from '../core/env.schema'
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

  fastify.register(fastifyEnv, {
    schema: envSchema,
  })

  fastify.after(() => {
    if (opts.basicAuth) {
      fastify.addHook('onRequest', fastify.basicAuth)
    }
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
