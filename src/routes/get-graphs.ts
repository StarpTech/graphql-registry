import type { Handler } from 'worktop'
import { list as listGraphs } from '../repositories/Graph'

/**
 * Returns all registered graphs
 *
 * @param req
 * @param res
 * @returns
 */
export const getGraphs: Handler = async function (req, res) {
  const allGraphs = await listGraphs()

  res.send(200, {
    success: true,
    data: allGraphs.map((graph) => graph.name),
  })
}
