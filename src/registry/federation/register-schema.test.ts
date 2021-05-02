import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import { cleanTest, createTestContext, createTestPrefix, getJwtHeader, TestContext } from '../../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should register new schema', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)
  t.like(
    res.json(),
    {
      data: {
        serviceName: `${t.context.testPrefix}_foo`,
        typeDefs: `type Query { hello: String }`,
        version: '1',
      },
      success: true,
    },
    'response payload match',
  )
})

test('Should not create multiple schemas when client and type_defs does not change', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '2',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `type Query { hello: String }`,
    version: '2',
  })
})

test('Should be able to register schemas from multiple clients', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { world: String }`,
      version: '2',
      service_name: `${t.context.testPrefix}_bar`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_bar`,
    typeDefs: `type Query { world: String }`,
    version: '2',
  })

  t.like(response.data[1], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `type Query { hello: String }`,
    version: '1',
  })


})

test('Should not be able to push invalid schema', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `foo`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 400)
})

test('Should be able to store multiple versions with the same schema and client combination', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { world: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { world: String }`,
      version: '2',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `type Query { world: String }`,
    version: '2',
  })
})

test('Should reject schema because it is not compatible with registry state', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_bar`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 400)
  t.true(res.json().error.includes('Field "Query.hello" can only be defined once.'))
})

test('Should return correct latest service schema with multiple graphs', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '2',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}_2`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  let response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `type Query { hello: String }`,
    version: '1',
  })

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: `${t.context.graphName}_2`,
    },
  })

  t.is(res.statusCode, 200)

  response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `type Query { hello: String }`,
    version: '2',
  })
})

test('Should return 400 because an service has no active schema registered', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  const schemaId = res.json().data.schemaId

  res = await app.inject({
    method: 'POST',
    url: '/schema/deactivate',
    payload: {
      schemaId,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_bar`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 400)
  t.deepEqual(res.json().error, `In graph "${t.context.graphName}", service "${t.context.testPrefix}_foo" has no schema registered`)
})

test('Should be able to register a schema with a valid JWT', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
    jwtSecret: 'secret',
  })
  t.teardown(() => app.prisma.$disconnect())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    headers: {
      ...getJwtHeader([`${t.context.testPrefix}_foo`]),
    },
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)
  t.like(
    res.json(),
    {
      data: {
        serviceName: `${t.context.testPrefix}_foo`,
        typeDefs: `type Query { hello: String }`,
        version: '1',
      },
      success: true,
    },
    'response payload match',
  )
})

test('Should not be able to register a schema with a jwt token that is not authorized for the service', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
    jwtSecret: 'secret',
  })
  t.teardown(() => app.prisma.$disconnect())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    headers: {
      ...getJwtHeader([`bar_client`]), // bar is not authorized
    },
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 401)
  t.like(
    res.json(),
    {
      error: `You are not authorized to access service "${t.context.testPrefix}_foo"`,
      success: false,
    },
    'response payload match',
  )
})

test('Should not be able to register a schema with a jwt token with empty services', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
    jwtSecret: 'secret',
  })
  t.teardown(() => app.prisma.$disconnect())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    headers: {
      ...getJwtHeader([]), // bar is not authorized
    },
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 401)
  t.like(
    res.json(),
    {
      error: `You are not authorized to access service "${t.context.testPrefix}_foo"`,
      success: false,
    },
    'response payload match',
  )
})
