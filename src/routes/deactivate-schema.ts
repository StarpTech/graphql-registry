import type { Handler } from 'worktop'
import { object, pattern, size, string, validate } from 'superstruct'
import { find as findGraph } from '../repositories/Graph'
import { find as findSchema, save as saveSchema } from '../repositories/Schema'

interface DeactivateSchemaRequest {
  schemaId: string
  graph_name: string
}

const deactivateRequest = object({
  schemaId: size(string(), 1, 100),
  graph_name: size(pattern(string(), /^[a-zA-Z_\-0-9]+/), 1, 100),
})

/**
 * Deactivate an existing schema
 *
 * @param req
 * @param res
 */
export const deactivateSchema: Handler = async function (req, res) {
  const requestBody = await req.body<DeactivateSchemaRequest>()
  const [error, input] = validate(requestBody, deactivateRequest)
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

  let schema = await findSchema(input.graph_name, input.schemaId)

  if (!schema) {
    return res.send(404, {
      success: false,
      error: 'Could not find schema',
    })
  }

  const updated = await saveSchema({
    ...schema,
    is_active: false,
  })

  if (!updated) {
    return res.send(500, {
      success: false,
      error: 'Could not disable schema',
    })
  }

  res.send(200, {
    success: true,
  })
}
