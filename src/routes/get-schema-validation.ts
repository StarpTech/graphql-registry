import type { Handler } from 'worktop'
import { object, pattern, size, string, validate } from 'superstruct'
import { list as listServices } from '../repositories/Service'
import { composeAndValidateSchema } from '../federation'
import { find as findGraph } from '../repositories/Graph'
import { SchemaService } from '../services/Schema'

interface GetSchemaValidationRequest {
  service_name: string
  type_defs: string
  graph_name: string
}

const validateRequest = object({
  type_defs: size(string(), 1, 10000),
  service_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
  graph_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
})

/**
 * Validate schema between provided and latest schemas.
 *
 * @param req
 * @param res
 * @returns
 */
export const getSchemaValidation: Handler = async function (req, res) {
  const requestBody = await req.body<GetSchemaValidationRequest>()
  const [error, input] = validate(requestBody, validateRequest)
  if (!input || error) {
    return res.send(400, {
      success: false,
      error: error?.message,
    })
  }

  const graph = await findGraph(input.graph_name)
  if (!graph) {
    return res.send(404, {
      success: false,
      error: `Graph with name "${input.graph_name}" does not exist`,
    })
  }

  const allServiceNames = await listServices(input.graph_name)
  const allServiceVersions = allServiceNames.map((s) => ({
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

  let serviceSchemas = schemas
    .map((s) => ({
      name: s.service_id,
      typeDefs: s.type_defs,
    }))
    .filter((schema) => schema.name !== input.service_name)
    .concat({
      name: input.service_name,
      typeDefs: input.type_defs,
    })

  const updated = composeAndValidateSchema(serviceSchemas)
  if (!updated.schema) {
    return res.send(400)
  }
  if (updated.error) {
    return res.send(400, {
      success: false,
      error: updated.error,
    })
  }

  res.send(200, {
    success: true,
  })
}
