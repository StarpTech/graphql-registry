import test from 'ava'
import { NewNamespace, Request, Response } from '../test-utils'
import { ErrorResponse, SchemaResponseModel, SuccessResponse } from '../types'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

test.serial('Should register new schema', async (t) => {
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

  let body = (res.body as any) as SuccessResponse<SchemaResponseModel>

  t.deepEqual(body, {
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

  t.is(res.statusCode, 200)

  t.deepEqual(res.body as any, {
    success: true,
    data: [
      {
        created_at: 1618948427027,
        is_active: true,
        service_id: 'foo',
        type_defs: 'type Query { hello: String }',
        uid: '916348424',
        updated_at: null,
        version: '1',
      },
    ],
  })
})

test.serial(
  'Should not create multiple schemas when type_defs does not change',
  async (t) => {
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

    req = Request('GET', '')
    res = Response()
    await getComposedSchema(req, res)

    t.is(res.statusCode, 200)

    t.deepEqual(res.body as any, {
      success: true,
      data: [
        {
          created_at: 1618948427027,
          is_active: true,
          service_id: 'foo',
          type_defs: 'type Query { hello: String }',
          uid: '916348424',
          updated_at: null,
          version: '1',
        },
      ],
    })

    req = Request('POST', '', {
      type_defs: 'type Query { hello: String }',
      version: '1',
      name: 'foo',
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
          created_at: 1618948427027,
          is_active: true,
          service_id: 'foo',
          type_defs: 'type Query { hello: String }',
          uid: '916348424',
          updated_at: 1618948427027,
          version: '1',
        },
      ],
    })
  },
)

test.serial('Should register schemas from multiple clients', async (t) => {
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
        created_at: 1618948427027,
        is_active: true,
        service_id: 'foo',
        type_defs: 'type Query { hello: String }',
        uid: '916348424',
        updated_at: null,
        version: '1',
      },
      {
        created_at: 1618948427027,
        is_active: true,
        service_id: 'bar',
        type_defs: 'type Query2 { hello: String }',
        uid: '1323442088',
        updated_at: null,
        version: '2',
      },
    ],
  })
})

test.serial('Should not be possible to push invalid schema', async (t) => {
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

  t.is(res.statusCode, 400)

  const body = (res.body as any) as ErrorResponse

  t.is(body.success, false)
  t.truthy(body.error)

  req = Request('GET', '')
  res = Response()
  await getComposedSchema(req, res)

  t.is(res.statusCode, 200)

  t.deepEqual(res.body as any, {
    success: true,
    data: [],
  })
})
