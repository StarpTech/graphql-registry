import test from 'ava'
import { assert, literal, number, object, size, string } from 'superstruct'
import { createEmptyNamespaces, Request, Response } from '../test-utils'
import { SuccessResponse, SchemaResponseModel, ErrorResponse } from '../types'
import { deactivateSchema } from './deactivate-schema'
import { getComposedSchemaByVersions } from './get-composed-schema-versions'
import { registerSchema } from './register-schema'

test.serial('Should return a specific schema version', async (t) => {
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
    type_defs: 'type Query2 { hello: String }',
    version: '2',
    service_name: 'bar',
    graph_name: 'my_graph',
  })
  res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('POST', '', {
    type_defs: 'type Query3 { hello: String }',
    version: '3',
    service_name: 'baz',
    graph_name: 'my_graph',
  })
  res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('POST', '', {
    graph_name: 'my_graph',
    services: [
      {
        service_name: 'bar',
        version: '2',
      },
    ],
  })
  res = Response()
  await getComposedSchemaByVersions(req, res)

  t.is(res.statusCode, 200)

  const result = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

  t.true(result.success)
  t.is(result.data.length, 1)

  assert(
    result.data[0],
    object({
      uid: size(string(), 26, 26),
      graph_name: literal('my_graph'),
      hash: size(string(), 4, 11),
      is_active: literal(true),
      service_id: literal('bar'),
      type_defs: literal('type Query2 { hello: String }'),
      created_at: number(),
      updated_at: literal(null),
      version: literal('2'),
    }),
  )
})

test.serial(
  'Should return 404 when schema in version could not be found',
  async (t) => {
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
      graph_name: 'my_graph',
      services: [
        {
          service_name: 'foo',
          version: '2',
        },
      ],
    })
    res = Response()
    await getComposedSchemaByVersions(req, res)

    t.is(res.statusCode, 400)

    const result = (res.body as any) as ErrorResponse

    t.false(result.success)
    t.is(result.error, 'Service "foo" in version "2" is not registered')
  },
)

test.serial('Should return 400 when no version was specified', async (t) => {
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
    graph_name: 'my_graph',
    services: [
      {
        service_name: 'foo',
      },
    ],
  })
  res = Response()
  await getComposedSchemaByVersions(req, res)

  t.is(res.statusCode, 400)

  const result = (res.body as any) as ErrorResponse

  t.false(result.success)
  t.is(
    result.error,
    'At path: services.0.version -- Expected a string, but received: undefined',
  )
})

test.serial(
  'Should return 400 when schema in specified version was deactivated',
  async (t) => {
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

    req = Request('PUT', '', {
      graph_name: 'my_graph',
      schemaId: result.data.uid,
    })
    res = Response()
    await deactivateSchema(req, res)
    t.is(res.statusCode, 200)

    req = Request('POST', '', {
      graph_name: 'my_graph',
      services: [
        {
          service_name: 'foo',
          version: '1',
        },
      ],
    })
    res = Response()
    await getComposedSchemaByVersions(req, res)

    t.is(res.statusCode, 400)

    const errResponse = (res.body as any) as ErrorResponse

    t.false(errResponse.success)
    t.true(errResponse.error.includes('is not active'))
  },
)
