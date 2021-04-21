import test from 'ava'
import { NewNamespace, Request, Response } from '../test-utils'
import { getSchemaDiff } from './get-schema-diff'
import { registerSchema } from './register-schema'

test.serial('Should calculate schema diff', async (t) => {
  NewNamespace(
    {
      name: 'SERVICES',
    },
    [],
  )

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
