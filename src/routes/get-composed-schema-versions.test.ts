import test from 'ava'
import { assert, literal, number, object, size, string } from 'superstruct'
import { NewNamespace, Request, Response } from '../test-utils'
import { SuccessResponse, SchemaResponseModel, ErrorResponse } from '../types'
import { getComposedSchemaByVersions } from './get-composed-schema-versions'
import { registerSchema } from './register-schema'

test.serial('Should return a specific schema version', async (t) => {
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

  req = Request('POST', '', {
    type_defs: 'type Query3 { hello: String }',
    version: '3',
    name: 'baz',
  })
  res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('POST', '', {
    services: [
      {
        name: 'bar',
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
      uid: size(string(), 4, 11),
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
      services: [
        {
          name: 'foo',
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
    services: [
      {
        name: 'foo',
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
