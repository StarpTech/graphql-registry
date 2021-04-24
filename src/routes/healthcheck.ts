import type { Handler } from 'worktop'

/**
 * Healthcheck endpoint. Useful for monitoring.
 *
 * @param req
 * @param res
 */
export const healthcheck: Handler = async function (req, res) {
  res.send(200)
}
