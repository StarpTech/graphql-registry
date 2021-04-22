import test from 'ava'
import { NewNamespace, Request, Response } from '../test-utils'
import { ErrorResponse, SchemaResponseModel, SuccessResponse } from '../types'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

test.serial('Should register new schema', async (t) => {
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

  let result = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  t.is(result.success, true)

  req = Request('GET', '')
  res = Response()
  await getComposedSchema(req, res)

  t.is(res.statusCode, 200)

  result = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  t.is(result.success, true)
  t.is(result.data.length, 1)
  t.truthy(result.data[0].uid)
  t.truthy(result.data[0].created_at)
  t.like(result.data[0], {
    is_active: true,
    service_id: 'foo',
    type_defs: 'type Query { hello: String }',
    updated_at: null,
    version: '1',
  })
})

test.serial(
  'Should not be able create multiple schema entries when type_defs does not change',
  async (t) => {
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

    req = Request('GET', '')
    res = Response()
    await getComposedSchema(req, res)

    t.is(res.statusCode, 200)

    let first = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

    t.is(first.success, true)
    t.is(first.data.length, 1)
    t.truthy(first.data[0].uid)
    t.truthy(first.data[0].created_at)
    t.like(first.data[0], {
      is_active: true,
      service_id: 'foo',
      type_defs: 'type Query { hello: String }',
      updated_at: null,
      version: '1',
    })

    req = Request('POST', '', {
      type_defs: 'type Query { hello: String }',
      version: '1',
      name: 'foo',
    })
    res = Response()
    await registerSchema(req, res)

    t.is(res.statusCode, 200)

    req = Request('GET', '')
    res = Response()
    await getComposedSchema(req, res)

    t.is(res.statusCode, 200)

    const current = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

    t.is(current.success, true)
    t.is(current.data.length, 1)
    t.truthy(current.data[0].updated_at)
    t.truthy(current.data[0].uid)
    t.truthy(current.data[0].created_at)
    t.like(current.data[0], {
      is_active: true,
      service_id: 'foo',
      type_defs: 'type Query { hello: String }',
      version: '1',
    })
  },
)

test.serial(
  'Should be able to register schemas from multiple clients',
  async (t) => {
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

    t.is(result.success, true)
    t.is(result.data.length, 2)
    t.truthy(result.data[0].uid)
    t.truthy(result.data[0].created_at)
    t.like(result.data[0], {
      is_active: true,
      service_id: 'foo',
      type_defs: 'type Query { hello: String }',
      updated_at: null,
      version: '1',
    })
    t.truthy(result.data[1].uid)
    t.truthy(result.data[1].created_at)
    t.like(result.data[1], {
      is_active: true,
      service_id: 'bar',
      type_defs: 'type Query2 { hello: String }',
      updated_at: null,
      version: '2',
    })
  },
)

test.serial('Should not be able to push invalid schema', async (t) => {
  NewNamespace({
    name: 'SERVICES',
  })

  let req = Request('POST', '', {
    type_defs: 'foo',
    version: '1',
    name: 'foo',
  })
  let res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 400)

  t.deepEqual(res.body as any, {
    success: false,
    error: 'Syntax Error: Unexpected Name "foo".',
  })

  const body = (res.body as any) as ErrorResponse

  t.is(body.success, false)
  t.truthy(body.error)

  req = Request('GET', '')
  res = Response()
  await getComposedSchema(req, res)

  t.is(res.statusCode, 200)

  t.deepEqual(res.body as any, {
    success: true,
    data: [],
  })
})

test('Should be able to store multiple versions of the same schema and client', async (t) => {
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
    type_defs: 'type Query { hello: String }',
    version: '2',
    name: 'foo',
  })
  res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('GET', '')
  res = Response()
  await getComposedSchema(req, res)

  t.is(res.statusCode, 200)

  const result = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  t.is(result.success, true)
  t.is(result.data.length, 1)
  t.truthy(result.data[0].uid)
  t.truthy(result.data[0].created_at)
  t.like(result.data[0], {
    is_active: true,
    service_id: 'foo',
    type_defs: 'type Query { hello: String }',
    version: '2',
  })
})
