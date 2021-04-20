import type { Handler } from 'worktop'
import { object, size, string, validate } from 'superstruct'
import { save as insertPQ } from '../repositories/PersistedQueries'

interface AddPQRequest {
  key: string
  query: string
}

const validateRequest = object({
  key: size(string(), 1, 100),
  query: size(string(), 1, 10000),
})

/**
 * Adds persisted query to KV Storage
 *
 * @param req
 * @param res
 */
export const addPersistedQuery: Handler = async function (req, res) {
  const requestBody = await req.body<AddPQRequest>()
  const [error, input] = validate(requestBody, validateRequest)
  if (!input || error) {
    return res.send(400, {
      success: false,
      error: error?.message,
    })
  }

  if (!(await insertPQ(input.key, input.query))) {
    return res.send(500, {
      success: false,
      error: 'Could not store persisted query',
    })
  }

  res.send(200, {
    success: true,
  })
}
