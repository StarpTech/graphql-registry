import tap from 'tap'
import { NewNamespace, Request, Response } from '../test-utils'
import { ErrorResponse, SchemaResponseModel, SuccessResponse } from '../types'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

tap.test('Register new schema', (t) => {
  t.test('Should register new schema', async (t) => {
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

    let body = (res.body as any) as SuccessResponse<SchemaResponseModel>

    t.same(body, {
      success: true,
      data: {
        uid: '916348424',
        service_id: 'foo',
        is_active: true,
        type_defs: 'type Query { hello: String }',
        created_at: 1618948427027,
        updated_at: null,
        version: '1',
      },
    })

    req = Request('GET', '')
    res = Response()
    await getComposedSchema(req, res)

    t.equal(res.statusCode, 200)

    t.matchSnapshot(res.body, "Client schemas after first push")

    t.end()
  })

  t.test('Should not create multiple schemas when type_defs does not change', async (t) => {
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

    req = Request('GET', '')
    res = Response()
    await getComposedSchema(req, res)

    t.equal(res.statusCode, 200)

    t.matchSnapshot(res.body, "First schema and client")

    req = Request('POST', '', {
      type_defs: 'type Query { hello: String }',
      version: '1',
      name: 'foo',
    })
    res = Response()
    await registerSchema(req, res)

    t.equal(res.statusCode, 200)

    req = Request('GET', '')
    res = Response()
    await getComposedSchema(req, res)

    t.equal(res.statusCode, 200)

    t.matchSnapshot(res.body, "Client schemas after second push same data")

    t.end()
  })

  t.test('Should register schemas from multiple clients', async (t) => {
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

    t.matchSnapshot(res.body, "schemas from two different clients")

    t.end()
  })

  t.test('Should not be possible to push invalid schema', async (t) => {
    NewNamespace(
      {
        name: 'SERVICES',
      },
      [],
    )

    let req = Request('POST', '', {
      type_defs: 'foo',
      version: '1',
      name: 'foo',
    })
    let res = Response()
    await registerSchema(req, res)

    t.equal(res.statusCode, 400)

    const body = (res.body as any) as ErrorResponse

    t.equal(body.success, false)
    t.ok(body.error)

    req = Request('GET', '')
    res = Response()
    await getComposedSchema(req, res)

    t.equal(res.statusCode, 200)

    t.matchSnapshot(res.body, "Empty")

    t.end()
  })
  t.end()
})
