import type { Handler } from 'worktop'
import { object, size, string, validate } from 'superstruct'
import { find as findSchema, save as saveSchema } from '../repositories/Schema'

interface DeactivateSchemaRequest {
  schemaId: string
}

const deactivateRequest = object({
  schemaId: size(string(), 1, 100),
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

  let schema = await findSchema(input.schemaId)

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
