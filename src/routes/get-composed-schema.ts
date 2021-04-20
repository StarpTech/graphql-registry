import type { Handler } from 'worktop'
import { list as listServices } from '../repositories/Service'
import { findByServiceVersions as findSchemasByServiceVersions } from '../repositories/Schema'
import { composeAndValidateSchema } from '../federation'
import { SchemaResponseModel } from '../types'

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

  const result: SchemaResponseModel[] = await findSchemasByServiceVersions(
    allServiceVersions,
  )

  const serviceSchemas = result.map((s) => ({
    name: s.service_id,
    typeDefs: s.type_defs,
  }))

  const { errors } = composeAndValidateSchema(serviceSchemas)

  if (errors.length > 0) {
    return res.send(400, {
      success: false,
      error: errors,
    })
  }

  res.send(200, {
    success: true,
    data: result,
  })
}
