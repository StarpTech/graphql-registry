import test from 'ava'
import { createEmptyNamespaces, Request, Response } from '../test-utils'
import { ErrorResponse } from '../types'
import { getSchemaValidation } from './get-schema-validation'
import { registerSchema } from './register-schema'

test.serial('Should validate schema as valid', async (t) => {
  createEmptyNamespaces(['GRAPHS', 'SERVICES', 'SCHEMAS', 'VERSIONS'])

  let req = Request('POST', '', {
    type_defs: 'type Query { hello: String }',
    version: '2',
    service_name: 'bar',
    graph_name: 'my_graph',
  })
  let res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('POST', '', {
    type_defs: 'type Query { world: String }',
    service_name: 'foo',
    graph_name: 'my_graph',
  })
  res = Response()
  await getSchemaValidation(req, res)

  t.is(res.statusCode, 200)
  t.deepEqual(res.body as any, {
    success: true,
  })
})

test.serial('Should validate schema as invalid', async (t) => {
  createEmptyNamespaces(['GRAPHS', 'SERVICES', 'SCHEMAS', 'VERSIONS'])

  let req = Request('POST', '', {
    type_defs: 'type Query { hello: String }',
    version: '2',
    service_name: 'bar',
    graph_name: 'my_graph',
  })
  let res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('POST', '', {
    type_defs: 'type Query { hello: String22 }',
    service_name: 'foo',
    graph_name: 'my_graph',
  })
  res = Response()
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
  createEmptyNamespaces(['GRAPHS', 'SERVICES', 'SCHEMAS', 'VERSIONS'])

  let req = Request('POST', '', {
    service_name: 'foo',
    graph_name: 'my_graph',
  })
  let res = Response()
  await getSchemaValidation(req, res)

  const body = (res.body as any) as ErrorResponse

  t.is(res.statusCode, 400)
  t.is(body.success, false)
})
