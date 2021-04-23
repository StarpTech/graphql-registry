import type { Handler } from 'worktop'
import { object, size, string, validate } from 'superstruct'
import { remove as removePQ } from '../repositories/PersistedQueries'

interface DeletePQRequest {
  key: string
  query: string
}

const deleteRequest = object({
  key: size(string(), 1, 100),
})

/**
 * Deletes persisted query from KV Storage
 *
 * @param req
 * @param res
 */
export const deletePersistedQuery: Handler = async function (req, res) {
  const requestBody = await req.body<DeletePQRequest>()
  const [error, input] = validate(requestBody, deleteRequest)
  if (!input || error) {
    return res.send(400, {
      success: false,
      error: error?.message,
    })
  }

  const result = await removePQ(input.key)

  if (!result) {
    return res.send(404, {
      success: false,
      error: 'Could not delete persisted query',
    })
  }

  res.send(200, {
    success: true,
  })
}
