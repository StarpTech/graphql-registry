import test from 'ava'
import { assert, literal, number, object, size, string } from 'superstruct'
import { createEmptyKVNamespaces, Request, Response } from '../test-utils'
import { SuccessResponse, SchemaResponseModel } from '../types'
import { deactivateSchema } from './deactivate-schema'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

test.serial('Should return schema of two services', async (t) => {
  createEmptyKVNamespaces(['GRAPHS', 'SERVICES', 'SCHEMAS', 'VERSIONS'])

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
    type_defs: 'type Query2 { hello: String }',
    version: '2',
    service_name: 'bar',
    graph_name: 'my_graph',
  })
  res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('GET', 'graph_name=my_graph')
  res = Response()
  await getComposedSchema(req, res)

  t.is(res.statusCode, 200)

  const result = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  t.true(result.success)
  t.is(result.data.length, 2)

  assert(
    result.data[0],
    object({
      uid: size(string(), 26, 26),
      graph_name: literal('my_graph'),
      hash: size(string(), 4, 11),
      is_active: literal(true),
      service_name: literal('foo'),
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
      graph_name: literal('my_graph'),
      hash: size(string(), 4, 11),
      is_active: literal(true),
      service_name: literal('bar'),
      type_defs: literal('type Query2 { hello: String }'),
      created_at: number(),
      updated_at: literal(null),
      version: literal('2'),
    }),
  )
})

test.serial(
  'Should always return the latest schema of a service',
  async (t) => {
    createEmptyKVNamespaces(['GRAPHS', 'SERVICES', 'SCHEMAS', 'VERSIONS'])

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
      type_defs: 'type Query { hello: String world: String }',
      version: '2',
      service_name: 'foo',
      graph_name: 'my_graph',
    })
    res = Response()
    await registerSchema(req, res)

    t.is(res.statusCode, 200)

    req = Request('POST', '', {
      type_defs: 'type Query { firstname: String }',
      version: '1',
      service_name: 'bar',
      graph_name: 'my_graph',
    })
    res = Response()
    await registerSchema(req, res)

    t.is(res.statusCode, 200)

    req = Request('POST', '', {
      type_defs: 'type Query { firstname: String lastName: String }',
      version: '2',
      service_name: 'bar',
      graph_name: 'my_graph',
    })
    res = Response()
    await registerSchema(req, res)

    t.is(res.statusCode, 200)

    req = Request('GET', 'graph_name=my_graph')
    res = Response()
    await getComposedSchema(req, res)

    t.is(res.statusCode, 200)

    const result = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

    t.true(result.success)
    t.is(result.data.length, 2)

    assert(
      result.data[0],
      object({
        uid: size(string(), 26, 26),
        graph_name: literal('my_graph'),
        hash: size(string(), 4, 11),
        is_active: literal(true),
        service_name: literal('foo'),
        type_defs: literal('type Query { hello: String world: String }'),
        created_at: number(),
        updated_at: literal(null),
        version: literal('2'),
      }),
    )

    assert(
      result.data[1],
      object({
        uid: size(string(), 26, 26),
        graph_name: literal('my_graph'),
        hash: size(string(), 4, 11),
        is_active: literal(true),
        service_name: literal('bar'),
        type_defs: literal('type Query { firstname: String lastName: String }'),
        created_at: number(),
        updated_at: literal(null),
        version: literal('2'),
      }),
    )
  },
)

test.serial(
  'Should return no schema because schema was deactivated and no version was specified',
  async (t) => {
    createEmptyKVNamespaces(['GRAPHS', 'SERVICES', 'SCHEMAS', 'VERSIONS'])

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

    req = Request('PUT', '', {
      graph_name: 'my_graph',
      service_name: 'foo',
      schemaId: result.data.uid,
    })
    res = Response()
    await deactivateSchema(req, res)
    t.is(res.statusCode, 200)

    req = Request('GET', 'graph_name=my_graph')
    res = Response()
    await getComposedSchema(req, res)

    t.is(res.statusCode, 200)

    const all = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

    t.is(all.success, true)
    t.is(all.data.length, 0)
  },
)
