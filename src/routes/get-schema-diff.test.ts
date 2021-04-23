import test from 'ava'
import { NewNamespace, Request, Response } from '../test-utils'
import { getSchemaDiff } from './get-schema-diff'
import { registerSchema } from './register-schema'

test.serial('Should calculate schema diff', async (t) => {
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
    name: 'foo',
    type_defs: 'type Query { hello: String world: String }',
  })
  res = Response()
  await getSchemaDiff(req, res)
  t.is(res.statusCode, 200)
  t.deepEqual(res.body as any, {
    success: true,
    data: [
      {
        criticality: {
          level: 'NON_BREAKING',
        },
        type: 'FIELD_ADDED',
        message: "Field 'world' was added to object type 'Query'",
        path: 'Query.world',
      },
    ],
  })
})

test.serial('Should detect a breaking change', async (t) => {
  NewNamespace({
    name: 'SERVICES',
  })

  let req = Request('POST', '', {
    type_defs: 'type Query { hello: String world: String }',
    version: '1',
    name: 'foo',
  })
  let res = Response()
  await registerSchema(req, res)

  t.is(res.statusCode, 200)

  req = Request('POST', '', {
    name: 'foo',
    type_defs: 'type Query { hello: String }',
  })
  res = Response()
  await getSchemaDiff(req, res)
  t.is(res.statusCode, 200)
  t.deepEqual(res.body as any, {
    success: true,
    data: [
      {
        criticality: {
          level: 'BREAKING',
          reason:
            'Removing a field is a breaking change. It is preferable to deprecate the field before removing it.',
        },
        type: 'FIELD_REMOVED',
        message: "Field 'world' was removed from object type 'Query'",
        path: 'Query.world',
      },
    ],
  })
})
