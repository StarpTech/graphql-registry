import test from 'ava'
import { NewNamespace, Request, Response } from '../test-utils'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

test.serial('Should return schema of two services', async (t) => {
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

  t.deepEqual(res.body as any, {
    success: true,
    data: [
      {
        uid: '916348424',
        service_id: 'foo',
        is_active: true,
        type_defs: 'type Query { hello: String }',
        created_at: 1618948427027,
        updated_at: null,
        version: '1',
      },
      {
        uid: '1323442088',
        service_id: 'bar',
        is_active: true,
        type_defs: 'type Query2 { hello: String }',
        created_at: 1618948427027,
        updated_at: null,
        version: '2',
      },
    ],
  })
})
