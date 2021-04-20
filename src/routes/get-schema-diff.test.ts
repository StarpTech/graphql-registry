import tap from 'tap'
import { NewNamespace, Request, Response } from '../test-utils'
import { ErrorResponse } from '../types'
import { getSchemaValidation } from './get-schema-validation'

tap.test('Schema validation', (t) => {
  t.test('Should validate schema as valid', async (t) => {
    NewNamespace(
      {
        name: 'SERVICES',
      },
      [],
    )

    let req = Request('POST', '', {
      type_defs: 'type Query { hello: String }',
      name: 'foo',
    })
    let res = Response()
    await getSchemaValidation(req, res)

    t.equal(res.statusCode, 200)
    t.same(res.body, {
      success: true,
    })
    t.end()
  })

  t.test('Should validate schema as invalid', async (t) => {
    NewNamespace(
      {
        name: 'SERVICES',
      },
      [],
    )

    let req = Request('POST', '', {
      type_defs: 'type Query { hello: String22 }',
      name: 'foo',
    })
    let res = Response()
    await getSchemaValidation(req, res)

    const body = (res.body as any) as ErrorResponse

    t.equal(res.statusCode, 400)
    t.equal(body.success, false)
    t.ok(body.error)
    t.end()
  })
  t.end()
})
