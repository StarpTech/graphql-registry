import type { Handler } from 'worktop'
import { array, object, pattern, size, string, validate } from 'superstruct'
import { composeAndValidateSchema } from '../federation'
import { find as findGraph } from '../repositories/Graph'
import { SchemaResponseModel, SuccessResponse } from '../types'
import { SchemaService } from '../services/Schema'

interface ServiceVersionMatch {
  name: string
  version: string
}

interface GetSchemaByVersionsRequest {
  services: ServiceVersionMatch[]
}

const validateRequest = object({
  graph_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
  services: array(
    object({
      version: size(string(), 1, 100),
      name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
    }),
  ),
})

/**
 * Lists schema based on passed services & their versions. Used by graphql gateway to fetch schema based on current containers
 *
 * @param req
 * @param res
 * @returns
 */
export const getComposedSchemaByVersions: Handler = async function (req, res) {
  const requestBody = await req.body<GetSchemaByVersionsRequest>()
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

  const allServiceVersions: ServiceVersionMatch[] = input.services.map((s) => ({
    name: s.name,
    version: s.version,
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

  const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

  if (error) {
    return res.send(400, {
      success: false,
      error: schemaError,
    })
  }

  const responseBody: SuccessResponse<SchemaResponseModel[]> = {
    success: true,
    data: schemas,
  }

  res.send(200, responseBody)
}
