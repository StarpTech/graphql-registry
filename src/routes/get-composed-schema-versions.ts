import type { Handler } from 'worktop'
import { array, object, size, string, validate } from 'superstruct'
import { findByServiceVersions as findSchemasByServiceVersions } from '../repositories/Schema'
import { composeAndValidateSchema } from '../federation'
import { SchemaResponseModel, SuccessResponse } from '../types'

interface ServiceVersionMatch {
  name: string
  version: string
}

interface GetSchemaByVersionsRequest {
  services: ServiceVersionMatch[]
}

const validateRequest = object({
  services: array(
    object({
      version: size(string(), 1, 100),
      name: size(string(), 1, 100),
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

  const allServiceVersions: ServiceVersionMatch[] = input.services.map((s) => ({
    name: s.name,
    version: s.version,
  }))

  const { schemas, error: findError } = await findSchemasByServiceVersions(
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
