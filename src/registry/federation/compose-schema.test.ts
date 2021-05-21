import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import { CURRENT_VERSION } from '../../core/constants'
import {
  cleanTest,
  createTestContext,
  createTestPrefix,
  TestContext,
  trimDoc,
} from '../../core/test-util'

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
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
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
      typeDefs: /* GraphQL */ `
        type Query {
          world: String
        }
      `,
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
  t.is(response.data.length, 2)

  t.truthy(response.data[0].lastUpdatedAt)
  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_bar`,
    typeDefs: trimDoc/* GraphQL */ `
      type Query {
        world: String
      }
    `,
    version: '2',
  })

  t.truthy(response.data[1].lastUpdatedAt)
  t.like(response.data[1], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: trimDoc/* GraphQL */ `
      type Query {
        hello: String
      }
    `,
    version: '1',
  })
})

test('Should return 400 error when graph does not exist', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 400)

  const response = res.json()

  t.false(response.success)

  t.is(response.error, `Graph with name "${t.context.graphName}" does not exist`)
})

test('Version "current" has no precedence over the last updated', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      version: CURRENT_VERSION,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })
  t.is(res.statusCode, 200)
  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: /* GraphQL */ `
        type Query {
          world: String
        }
      `,
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
    typeDefs: trimDoc/* GraphQL */ `
      type Query {
        world: String
      }
    `,
    version: '2',
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
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      version: '1',
      routingUrl: 'http://localhost:3000/api/graphql',
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
    typeDefs: trimDoc/* GraphQL */ `
      type Query {
        hello: String
      }
    `,
    routingUrl: 'http://localhost:3000/api/graphql',
    version: '1',
  })
})
