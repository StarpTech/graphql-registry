import test from 'ava'
import { NewNamespace, Request, Response } from '../test-utils'
import { ErrorResponse } from '../types'
import { getSchemaValidation } from './get-schema-validation'

test.serial('Should validate schema as valid', async (t) => {
  NewNamespace({
    name: 'SERVICES',
  })

  let req = Request('POST', '', {
    type_defs: 'type Query { hello: String }',
    name: 'foo',
  })
  let res = Response()
  await getSchemaValidation(req, res)

  t.is(res.statusCode, 200)
  t.deepEqual(res.body as any, {
    success: true,
  })
})

test.serial('Should validate schema as invalid', async (t) => {
  NewNamespace({
    name: 'SERVICES',
  })

  let req = Request('POST', '', {
    type_defs: 'type Query { hello: String22 }',
    name: 'foo',
  })
  let res = Response()
  await getSchemaValidation(req, res)

  const body = (res.body as any) as ErrorResponse

  t.is(res.statusCode, 400)
  t.is(body.success, false)

  t.deepEqual(body as any, {
    success: false,
    error: 'Error: Unknown type: "String22".',
  })
})

test.serial('Should return 400 when type_defs is missing', async (t) => {
  NewNamespace({
    name: 'SERVICES',
  })

  let req = Request('POST', '', {
    name: 'foo',
  })
  let res = Response()
  await getSchemaValidation(req, res)

  const body = (res.body as any) as ErrorResponse

  t.is(res.statusCode, 400)
  t.is(body.success, false)
})
