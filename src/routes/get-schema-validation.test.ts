import tap from 'tap'
import { NewNamespace, Request, Response } from '../test-utils'
import { getSchemaDiff } from './get-schema-diff'
import { registerSchema } from './register-schema'

tap.test('Schema diff', (t) => {
  t.test('Should calculate schema diff', async (t) => {
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

    t.equal(res.statusCode, 200)

    req = Request('POST', '', {
      name: 'foo',
      type_defs: 'type Query { hello: String world: String }',
    })
    res = Response()
    await getSchemaDiff(req, res)
    t.equal(res.statusCode, 200)
    t.same(res.body, {
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
    t.end()
  })
  t.end()
})
