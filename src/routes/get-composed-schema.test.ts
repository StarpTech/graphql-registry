import tap from 'tap'
import { NewNamespace, Request, Response } from '../test-utils'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

tap.test('Composed schema', (t) => {
  t.test('Should return schema of two services', async (t) => {
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
      type_defs: 'type Query2 { hello: String }',
      version: '2',
      name: 'bar',
    })
    res = Response()
    await registerSchema(req, res)

    t.equal(res.statusCode, 200)

    req = Request('GET', '')
    res = Response()
    await getComposedSchema(req, res)

    t.equal(res.statusCode, 200)

    t.matchSnapshot(req.body, 'Composed schema of two clients')

    t.end()
  })
  t.end()
})
