import type { Handler } from 'worktop'
import { object, pattern, size, string, validate } from 'superstruct'
import {
  find as findService,
  insert as insertService,
  list as listServices,
} from '../repositories/Service'
import { find as findGraph, insert as insertGraph } from '../repositories/Graph'
import {
  list as listSchemaVersions,
  insert as insertSchemaVersion,
} from '../repositories/SchemaVersion'
import {
  insert as insertSchema,
  save as saveSchema,
} from '../repositories/Schema'
import { SchemaService } from '../services/Schema'
import { composeAndValidateSchema } from '../federation'
import { SchemaResponseModel, SuccessResponse } from '../types'

interface RegisterRequest {
  service_name: string
  version: string
  type_defs: string
  graph_name: string
}

const validateRequest = object({
  version: size(string(), 1, 100),
  type_defs: size(string(), 1, 10000),
  service_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
  graph_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
})

/**
 * Validates and registers new schema for a service
 *
 * @param req
 * @param res
 * @returns
 */
export const registerSchema: Handler = async function (req, res) {
  const requestBody = await req.body<RegisterRequest>()
  const [error, input] = validate(requestBody, validateRequest)
  if (!input || error) {
    return res.send(400, {
      success: false,
      error: error?.message,
    })
  }
  /**
   * Validate new schema with existing schemas of all services
   */
  const allServiceNames = await listServices(input.graph_name)
  const allServiceVersions = allServiceNames
    .filter((s) => s !== input.service_name)
    .map((s) => ({
      name: s,
    }))

  const schmemaService = new SchemaService()
  const {
    schemas,
    error: findError,
  } = await schmemaService.findByServiceVersions(
    input.graph_name,
    allServiceVersions,
  )

  if (findError) {
    return res.send(400, {
      success: false,
      error: findError?.message,
    })
  }

  const serviceSchemas = schemas.map((s) => ({
    name: s.service_id,
    typeDefs: s.type_defs,
  }))

  serviceSchemas.push({
    name: input.service_name,
    typeDefs: input.type_defs,
  })

  const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

  if (schemaError) {
    return res.send(400, {
      success: false,
      error: schemaError,
    })
  }

  /**
   * Create new service
   */
  let service = await findService(input.graph_name, input.service_name)
  if (!service) {
    service = await insertService(input.graph_name, input.service_name, {
      is_active: true,
    })
    if (!service) {
      throw new Error('Could not create service')
    }
  }

  /**
   * Create new graph
   */
  let graph = await findGraph(input.graph_name)
  if (!graph) {
    graph = await insertGraph({ is_active: true, name: input.graph_name })
    if (!graph) {
      throw new Error('Could not create graph')
    }
  }

  /**
   * Create new schema
   */
  let schema = await schmemaService.findByHash(
    input.graph_name,
    input.type_defs,
  )
  if (!schema) {
    schema = await insertSchema({
      type_defs: input.type_defs,
      is_active: true,
      graph_name: graph.name,
      service_id: service.name,
    })
    if (!schema) {
      throw new Error('Could not create schema')
    }
  } else {
    schema = {
      ...schema,
      is_active: true,
      updated_at: Date.now(),
    }
    await saveSchema(schema)
  }

  /**
   * Create new schema version
   */
  let schemaId = schema.uid
  let allVersions = await listSchemaVersions(graph.name, service.name)

  let schemaVersion = allVersions.find(
    (s) => s.schema_id === schemaId && s.version === input.version,
  )
  if (!schemaVersion) {
    let newVersion = await insertSchemaVersion(graph.name, service.name, {
      schema_id: schema.uid,
      service_name: service.name,
      version: input.version,
    })
    if (!newVersion) {
      throw new Error('Could not create schema version')
    }
    schemaVersion = newVersion
  }

  const responseBody: SuccessResponse<SchemaResponseModel> = {
    success: true,
    data: {
      uid: schema.uid,
      graph_name: schema.graph_name,
      created_at: schema.created_at,
      updated_at: schema.updated_at,
      is_active: schema.is_active,
      service_id: schema.service_id,
      type_defs: schema.type_defs,
      hash: schema.hash,
      version: schemaVersion.version,
    },
  }

  res.send(200, responseBody)
}
