import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import { CURRENT_VERSION } from '../../core/constants'
import {
  cleanTest,
  createTestContext,
  createTestPrefix,
  getJwtHeader,
  TestContext,
} from '../../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should register new schema', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  const response = res.json()

  t.is(res.statusCode, 200)
  t.truthy(response.data.lastUpdatedAt)
  t.like(
    response,
    {
      data: {
        serviceName: `${t.context.testPrefix}_foo`,
        typeDefs: `schema{query:Query}type Query{hello:String}`,
        version: '1',
      },
      success: true,
    },
    'response payload match',
  )
})

test('Should register new schema with service "routingUrl"', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      routingUrl: 'http://localhost:3000/api/graphql',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)
  t.like(
    res.json(),
    {
      data: {
        serviceName: `${t.context.testPrefix}_foo`,
        typeDefs: `schema{query:Query}type Query{hello:String}`,
        routingUrl: 'http://localhost:3000/api/graphql',
        version: '1',
      },
      success: true,
    },
    'response payload match',
  )
})

test('Should keep metdata like graphql directives', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `schema { query:Query }
        type Query { me: User}
        type User @key(fields:"id") {
          id:ID!
          username:String @deprecated(reason:"Use \`newField\`.")
        }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  const response = res.json()

  t.is(res.statusCode, 200)
  t.truthy(response.data.lastUpdatedAt)
  t.like(
    response,
    {
      data: {
        serviceName: `${t.context.testPrefix}_foo`,
        typeDefs:
          'schema{query:Query}type Query{me:User}type User@key(fields:"id"){id:ID!username:String@deprecated(reason:"Use `newField`.")}',
        version: '1',
      },
      success: true,
    },
    'response payload match',
  )
})

test('Should return 400 when routingUrl is not valid URI', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      routingUrl: 'foo',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 400)
  t.like(
    res.json(),
    {
      error: 'body.routingUrl should match format "uri"',
      success: false,
    },
    'response payload match',
  )
})

test('Should normalize a schema: Remove whitespaces, Sorting fields, directives, mutations, subscriptions, types', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res1 = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String bar: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res1.statusCode, 200)

  const res2 = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query     { bar: String hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res2.statusCode, 200)
  t.is(res1.json().data.schemaId, res2.json().data.schemaId)
})

test('Should use version "current" when no version was specified', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)
  t.like(
    res.json(),
    {
      data: {
        serviceName: `${t.context.testPrefix}_foo`,
        typeDefs: `schema{query:Query}type Query{hello:String}`,
        version: CURRENT_VERSION,
      },
      success: true,
    },
    'response payload match',
  )
})

test('Should not create multiple schemas when client and typeDefs does not change', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '2',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `schema{query:Query}type Query{hello:String}`,
    version: '2',
  })
})

test('Should be able to register schemas from multiple clients', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { world: String }`,
      version: '2',
      serviceName: `${t.context.testPrefix}_bar`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_bar`,
    typeDefs: `schema{query:Query}type Query{world:String}`,
    version: '2',
  })

  t.like(response.data[1], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `schema{query:Query}type Query{hello:String}`,
    version: '1',
  })
})

test('Should not be able to push invalid schema', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `foo`, // invalid GraphQL SDL
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 400)
})

test('Should be able to store multiple versions of the same schema with the same client', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { world: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { world: String }`,
      version: '2',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `schema{query:Query}type Query{world:String}`,
    version: '2',
  })
})

test('Should reject schema because it is not compatible with registry state', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_bar`,
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 400)
  t.true(res.json().error.includes('Field "Query.hello" can only be defined once.'))
})

test('Should not reject schema because breaking changes can be applied', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String world: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)
})

test('Should return correct latest service schema with multiple graphs', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '2',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}_2`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  let response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `schema{query:Query}type Query{hello:String}`,
    version: '1',
  })

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graphName: `${t.context.graphName}_2`,
    },
  })

  t.is(res.statusCode, 200)

  response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `schema{query:Query}type Query{hello:String}`,
    version: '2',
  })
})

test('Should return 400 because an service has no active schema registered', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  const schemaId = res.json().data.schemaId

  res = await app.inject({
    method: 'PUT',
    url: '/schema/deactivate',
    payload: {
      schemaId,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_bar`,
      graphName: t.context.graphName,
    },
  })

  t.is(res.statusCode, 400)
  t.deepEqual(
    res.json().error,
    `In graph "${t.context.graphName}", service "${t.context.testPrefix}_foo" has no schema registered`,
  )
})

test('Should be able to register a schema with a valid JWT', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
    jwtSecret: 'secret',
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    headers: {
      ...getJwtHeader({
        client: `${t.context.testPrefix}_foo`,
        services: [],
      }),
    },
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)
  t.like(
    res.json(),
    {
      data: {
        serviceName: `${t.context.testPrefix}_foo`,
        typeDefs: `schema{query:Query}type Query{hello:String}`,
        version: '1',
      },
      success: true,
    },
    'response payload match',
  )
})

test('Should be able to register a schema in name of another service', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
    jwtSecret: 'secret',
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    headers: {
      ...getJwtHeader({
        client: `${t.context.testPrefix}_bar`,
        services: [`${t.context.testPrefix}_foo`],
      }),
    },
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)
  t.like(
    res.json(),
    {
      data: {
        serviceName: `${t.context.testPrefix}_foo`,
        typeDefs: `schema{query:Query}type Query{hello:String}`,
        version: '1',
      },
      success: true,
    },
    'response payload match',
  )
})

test('Should not be able to register a schema with a jwt token because client is not authorized to act as the service', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
    jwtSecret: 'secret',
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    headers: {
      ...getJwtHeader({
        client: `bar_foo`,
        services: [],
      }), // bar is not authorized
    },
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
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
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    headers: {
      ...getJwtHeader({
        client: `bar_client`,
        services: [],
      }), // bar is not authorized
    },
    payload: {
      typeDefs: `type Query { hello: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
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
