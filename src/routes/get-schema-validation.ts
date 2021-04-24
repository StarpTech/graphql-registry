import type { Handler } from 'worktop'
import { object, size, string, validate } from 'superstruct'
import { list as listServices } from '../repositories/Service'
import { composeAndValidateSchema } from '../federation'
import { SchemaService } from '../services/Schema'

interface GetSchemaValidationRequest {
  name: string
  type_defs: string
}

const validateRequest = object({
  type_defs: size(string(), 1, 10000),
  name: size(string(), 1, 100),
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

  const allServiceNames = await listServices()
  const allServiceVersions = allServiceNames.map((s) => ({
    name: s,
  }))

  const schmemaService = new SchemaService()
  const {
    schemas,
    error: findError,
  } = await schmemaService.findByServiceVersions(allServiceVersions)

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
    .filter((schema) => schema.name !== input.name)
    .concat({
      name: input.name,
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
