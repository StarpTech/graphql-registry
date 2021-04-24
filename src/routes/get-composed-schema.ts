import type { Handler } from 'worktop'
import { list as listServices } from '../repositories/Service'
import { composeAndValidateSchema } from '../federation'
import { SchemaService } from '../services/Schema'

/**
 * Simplified version of /schema/compose where latest versions from different services is composed. Needed mostly for debugging
 *
 * @param req
 * @param res
 * @returns
 */
export const getComposedSchema: Handler = async function (req, res) {
  const allServiceNames = await listServices()

  if (!allServiceNames.length) {
    return res.send(200, {
      success: true,
      data: [],
    })
  }

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

  if (!schemas.length) {
    return res.send(200, {
      success: true,
      data: [],
    })
  }

  const serviceSchemas = schemas.map((s) => ({
    name: s.service_id,
    typeDefs: s.type_defs,
  }))

  const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

  if (schemaError) {
    return res.send(400, {
      success: false,
      error: schemaError,
    })
  }

  res.send(200, {
    success: true,
    data: schemas,
  })
}
