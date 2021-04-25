import test from 'ava'
import { createEmptyNamespaces, Request, Response } from '../test-utils'
import { SchemaResponseModel, SuccessResponse } from '../types'
import { deactivateSchema } from './deactivate-schema'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

test.serial('Should deactivate schema', async (t) => {
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

  let result = (res.body as any) as SuccessResponse<SchemaResponseModel>

  req = Request('GET', 'graph_name=my_graph')
  res = Response()
  await getComposedSchema(req, res)

  let all = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  t.is(res.statusCode, 200)
  t.is(all.success, true)
  t.is(all.data.length, 1)

  req = Request('PUT', '', {
    graph_name: 'my_graph',
    schemaId: result.data.uid,
  })
  res = Response()
  await deactivateSchema(req, res)
  t.is(res.statusCode, 200)

  req = Request('GET', 'graph_name=my_graph')
  res = Response()
  await getComposedSchema(req, res)

  t.is(res.statusCode, 200)

  all = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  // succeeded beause no version was provided
  t.is(all.success, true)
  t.is(all.data.length, 0)
})
