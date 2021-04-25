import test from 'ava'
import { createEmptyNamespaces, Request, Response } from '../test-utils'
import { SuccessResponse } from '../types'
import { getGraphs } from './get-graphs'
import { registerSchema } from './register-schema'

test.serial('Should return all registered graphs', async (t) => {
  createEmptyNamespaces(['GRAPHS', 'SERVICES', 'SCHEMAS', 'VERSIONS'])

  let req = Request('POST', '', {
    type_defs: 'type Query { hello: String }',
    version: '1',
    service_name: 'foo',
    graph_name: 'my_graph',
  })
  let res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('POST', '', {
    type_defs: 'type Query { hello: String }',
    version: '1',
    service_name: 'bar',
    graph_name: 'my_graph_2',
  })
  res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('GET', '')
  res = Response()
  await getGraphs(req, res)

  t.is(res.statusCode, 200)

  const result = (res.body as any) as SuccessResponse<string[]>

  t.true(result.success)
  t.is(result.data.length, 2)
  t.deepEqual(result.data, ['my_graph', 'my_graph_2'])
})
