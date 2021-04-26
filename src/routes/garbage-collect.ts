import type { Handler } from 'worktop'
import { number, object, size, validate } from 'superstruct'
import {
  remove as removeSchema,
  list as listSchemas,
  SchemaIndex,
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
  const removeSchemas = new Map<string, SchemaIndex[]>()

  for (const graph of graphs) {
    const services = await listServices(graph)
    for (const service of services) {
      const schemaIndexes = await listSchemas(graph, service)
      const serviceSchemas = schemaIndexes.filter(
        (s) => s.service_name === service,
      )
      removeSchemas.set(service, serviceSchemas.splice(input.num_schemas_keep))
    }
  }

  const removedSchemas = []

  for (const [serviceName, schemaIndexesToRemove] of removeSchemas) {
    for (const schemaIndexToRemove of schemaIndexesToRemove) {
      const schemaVersions = await listSchemaVersions(
        schemaIndexToRemove.graph_name,
        schemaIndexToRemove.service_name,
      )
      for (const version of schemaVersions) {
        const result = await removeVersion(
          schemaIndexToRemove.graph_name,
          schemaIndexToRemove.service_name,
          version.version,
        )
        if (!result) {
          continue
        }
      }
      const result = await removeSchema(
        schemaIndexToRemove.graph_name,
        serviceName,
        schemaIndexToRemove.uid,
      )
      if (!result) {
        continue
      }
      removedSchemas.push({
        graph_name: schemaIndexToRemove.graph_name,
        schemaId: schemaIndexToRemove.uid,
        service_name: schemaIndexToRemove.service_name,
      })
    }
  }

  res.send(200, {
    success: true,
    data: removedSchemas as GarbageCollectResponseModel[],
  })
}
