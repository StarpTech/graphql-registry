import test from 'ava'
import { assert, literal, number, object, size, string } from 'superstruct'
import { NewNamespace, Request, Response } from '../test-utils'
import { ErrorResponse, SchemaResponseModel, SuccessResponse } from '../types'
import { deactivateSchema } from './deactivate-schema'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

test.serial('Should deactivate schema', async (t) => {
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

  let result = (res.body as any) as SuccessResponse<SchemaResponseModel>

  req = Request('GET', '')
  res = Response()
  await getComposedSchema(req, res)

  let all = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  t.is(res.statusCode, 200)
  t.is(all.success, true)
  t.is(all.data.length, 1)

  req = Request('PUT', '', {
    schemaId: result.data.uid,
  })
  res = Response()
  await deactivateSchema(req, res)
  t.is(res.statusCode, 200)

  req = Request('GET', '')
  res = Response()
  await getComposedSchema(req, res)

  t.is(res.statusCode, 200)

  all = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  // succeeded beause no version was provided
  t.is(all.success, true)
  t.is(all.data.length, 0)
})
