import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import { CURRENT_VERSION } from '../../core/constants'
import { cleanTest, createTestContext, createTestPrefix, TestContext } from '../../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should return schema of two services', async (t) => {
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
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { world: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_bar`,
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
    method: 'POST',
    url: '/schema/compose',
    payload: {
      graphName: `${t.context.graphName}`,
      services: [
        {
          name: `${t.context.testPrefix}_foo`,
          version: '2',
        },
        {
          name: `${t.context.testPrefix}_bar`,
          version: '2',
        },
      ],
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)
  t.is(response.data.length, 2)

  t.truthy(response.data[0].lastUpdatedAt)
  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: 'type Query{hello:String}',
    version: '2',
  })

  t.truthy(response.data[1].lastUpdatedAt)
  t.like(response.data[1], {
    serviceName: `${t.context.testPrefix}_bar`,
    typeDefs: 'type Query{world:String}',
    version: '2',
  })
})

test('Should return validation error when no version was specified', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/compose',
    payload: {
      graphName: `${t.context.graphName}`,
      services: [
        {
          name: `${t.context.testPrefix}_foo`,
        },
      ],
    },
  })

  t.is(res.statusCode, 400)

  const response = res.json()

  t.false(response.success)

  t.is(response.error, "body.services[0] should have required property 'version'")
})

test('Should return 400 error when graph does not exist', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/compose',
    payload: {
      graphName: `${t.context.graphName}`,
      services: [
        {
          name: `foo`,
          version: '1',
        },
      ],
    },
  })

  t.is(res.statusCode, 400)

  const response = res.json()

  t.false(response.success)

  t.is(response.error, `Graph with name "${t.context.graphName}" does not exist`)
})

test('Should return 404 when schema in version could not be found', async (t) => {
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
    url: '/schema/compose',
    payload: {
      graphName: `${t.context.graphName}`,
      services: [
        {
          name: `${t.context.testPrefix}_foo`,
          version: '2',
        },
      ],
    },
  })

  t.is(res.statusCode, 400)

  t.deepEqual(
    res.json(),
    {
      error: `In graph "${t.context.graphName}", service "${t.context.testPrefix}_foo" has no schema in version "2" registered`,
      success: false,
    },
    'response payload match',
  )
})

test('Should return 400 when schema in specified version was deactivated', async (t) => {
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
    url: '/schema/compose',
    payload: {
      graphName: `${t.context.graphName}`,
      services: [
        {
          name: `${t.context.testPrefix}_foo`,
          version: '1',
        },
      ],
    },
  })

  t.is(res.statusCode, 400)

  t.deepEqual(
    res.json(),
    {
      error: `In graph "${t.context.graphName}", service "${t.context.testPrefix}_foo" has no schema in version "1" registered`,
      success: false,
    },
    'response payload match',
  )
})

test('Version "current" should always return the latest (not versioned) registered schema version', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { hello: String }`,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })
  t.is(res.statusCode, 200)

  const firstSchema = res.json()

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { world: String }`,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })
  t.is(res.statusCode, 200)

  const secondSchema = res.json()

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { world: String }`,
      serviceName: `${t.context.testPrefix}_foo`,
      version: '1',
      graphName: `${t.context.graphName}`,
    },
  })
  t.is(res.statusCode, 200)

  t.is(firstSchema.version, secondSchema.version)

  res = await app.inject({
    method: 'POST',
    url: '/schema/compose',
    payload: {
      graphName: `${t.context.graphName}`,
      services: [
        {
          name: `${t.context.testPrefix}_foo`,
          version: CURRENT_VERSION,
        },
      ],
    },
  })

  const response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: `type Query{world:String}`,
    version: CURRENT_VERSION,
  })
})

test('Should include "routingUrl" of the service', async (t) => {
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
      routingUrl: 'http://localhost:3000/api/graphql',
      graphName: `${t.context.graphName}`,
    },
  })
  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/compose',
    payload: {
      graphName: `${t.context.graphName}`,
      services: [
        {
          name: `${t.context.testPrefix}_foo`,
          version: '1',
        },
      ],
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: 'type Query{hello:String}',
    routingUrl: 'http://localhost:3000/api/graphql',
    version: '1',
  })
})
