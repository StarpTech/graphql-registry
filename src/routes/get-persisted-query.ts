import type { Handler } from 'worktop'
import { find as findPQ } from '../repositories/PersistedQueries'

/**
 * Looks up persisted query from KV Storage
 *
 * @param req
 * @param res
 */
export const getPersistedQuery: Handler = async function (req, res) {
  const key = req.query.get('key')
  if (!key) {
    return res.send(400, {
      success: false,
      error: 'No key was provided',
    })
  }

  const result = await findPQ(key)

  if (!result) {
    return res.send(404, {
      success: false,
      error: 'Could not find persisted query',
    })
  }

  res.send(200, {
    success: true,
    data: result,
  })
}
