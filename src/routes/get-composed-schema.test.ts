import test from 'ava'
import { NewNamespace, Request, Response } from '../test-utils'
import { SuccessResponse, SchemaResponseModel } from '../types'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

test.serial('Should return schema of two services', async (t) => {
  NewNamespace({
    name: 'SERVICES',
  })

  let req = Request('POST', '', {
    type_defs: 'type Query { hello: String }',
    version: '1',
    name: 'foo',
  })
  let res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('POST', '', {
    type_defs: 'type Query2 { hello: String }',
    version: '2',
    name: 'bar',
  })
  res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('GET', '')
  res = Response()
  await getComposedSchema(req, res)

  t.is(res.statusCode, 200)

  const result = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  t.true(result.success)
  t.is(result.data.length, 2)
  t.truthy(result.data[0].uid)
  t.truthy(result.data[0].created_at)
  t.like(result.data[0], {
    service_id: 'foo',
    is_active: true,
    type_defs: 'type Query { hello: String }',
    updated_at: null,
    version: '1',
  })
  t.truthy(result.data[1].uid)
  t.truthy(result.data[1].created_at)
  t.like(result.data[1], {
    service_id: 'bar',
    is_active: true,
    type_defs: 'type Query2 { hello: String }',
    updated_at: null,
    version: '2',
  })
})
