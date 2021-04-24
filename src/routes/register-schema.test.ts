import test from 'ava'
import { assert, literal, number, object, size, string } from 'superstruct'
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

  assert(
    result.data[0],
    object({
      uid: size(string(), 26, 26),
      hash: size(string(), 4, 11),
      is_active: literal(true),
      service_id: literal('foo'),
      type_defs: literal('type Query { hello: String }'),
      created_at: number(),
      updated_at: literal(null),
      version: literal('1'),
    }),
  )
})

test.serial(
  'Should not create multiple schemas when client and type_defs does not change',
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

    assert(
      first.data[0],
      object({
        uid: size(string(), 26, 26),
        hash: size(string(), 4, 11),
        is_active: literal(true),
        service_id: literal('foo'),
        type_defs: literal('type Query { hello: String }'),
        created_at: number(),
        updated_at: literal(null),
        version: literal('1'),
      }),
    )

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

    assert(
      current.data[0],
      object({
        uid: size(string(), 26, 26),
        hash: size(string(), 4, 11),
        is_active: literal(true),
        service_id: literal('foo'),
        type_defs: literal('type Query { hello: String }'),
        created_at: number(),
        updated_at: number(), // updated
        version: literal('1'),
      }),
    )
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

    assert(
      result.data[0],
      object({
        uid: size(string(), 26, 26),
        hash: size(string(), 4, 11),
        is_active: literal(true),
        service_id: literal('foo'),
        type_defs: literal('type Query { hello: String }'),
        created_at: number(),
        updated_at: literal(null),
        version: literal('1'),
      }),
    )

    assert(
      result.data[1],
      object({
        uid: size(string(), 26, 26),
        hash: size(string(), 4, 11),
        is_active: literal(true),
        service_id: literal('bar'),
        type_defs: literal('type Query2 { hello: String }'),
        created_at: number(),
        updated_at: literal(null),
        version: literal('2'),
      }),
    )
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

test('Should be able to store multiple versions with the same schema and client combination', async (t) => {
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

  assert(
    result.data[0],
    object({
      uid: size(string(), 26, 26),
      hash: size(string(), 4, 11),
      is_active: literal(true),
      service_id: literal('foo'),
      type_defs: literal('type Query { hello: String }'),
      created_at: number(),
      updated_at: number(),
      version: literal('2'),
    }),
  )
})

test('Should reject schema because it is not compatible with registry state', async (t) => {
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
    version: '1',
    name: 'bar',
  })
  res = Response()
  await registerSchema(req, res)

  const result = (res.body as any) as ErrorResponse

  t.is(res.statusCode, 400)
  t.true(result.error.includes('Field "Query.hello" can only be defined once.'))
})
