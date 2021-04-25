import type { Handler } from 'worktop'
import { number, object, size, validate } from 'superstruct'
import {
  remove as removeSchema,
  list as listSchemas,
} from '../repositories/Schema'
import { list as listGraphs } from '../repositories/Graph'
import {
  remove as removeVersion,
  list as listSchemaVersions,
} from '../repositories/SchemaVersion'
import { list as listServices } from '../repositories/Service'
import { GarbageCollectResponseModel } from '../types'

interface GarbageCollectRequest {
  num_schemas_keep: number
}

const garbageCollectRequest = object({
  num_schemas_keep: size(number(), 10, 100),
})

/**
 * Removes all schemas except the most recent N entries
 *
 * @param req
 * @param res
 */
export const garbageCollectSchemas: Handler = async function (req, res) {
  const requestBody = await req.body<GarbageCollectRequest>()
  const [error, input] = validate(requestBody, garbageCollectRequest)
  if (!input || error) {
    return res.send(400, {
      success: false,
      error: error?.message,
    })
  }

  const graphs = await listGraphs()
  const remove = []

  for await (const graph of graphs) {
    const schemaIndexes = await listSchemas(graph)
    const services = await listServices(graph)
    for (const service of services) {
      const serviceSchemas = schemaIndexes.filter(
        (s) => s.service_name === service,
      )
      remove.push(...serviceSchemas.splice(input.num_schemas_keep))
    }
  }

  const removedSchemas = []
  for await (const schemaIndex of remove) {
    const schemaVersions = await listSchemaVersions(
      schemaIndex.graph_name,
      schemaIndex.service_name,
    )
    for await (const version of schemaVersions) {
      const result = await removeVersion(
        schemaIndex.graph_name,
        schemaIndex.service_name,
        version.version,
      )
      if (!result) {
        continue
      }
    }
    const result = await removeSchema(schemaIndex.graph_name, schemaIndex.uid)
    if (!result) {
      continue
    }
    removedSchemas.push({
      graph_name: schemaIndex.graph_name,
      schemaId: schemaIndex.uid,
      service_name: schemaIndex.service_name,
    })
  }

  res.send(200, {
    success: true,
    data: removedSchemas as GarbageCollectResponseModel[],
  })
}
