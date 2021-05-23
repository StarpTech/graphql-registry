import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
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

test('Should check the schema for changes with the latest registry state', async (t) => {
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
      routingUrl: `http://${t.context.testPrefix}_foo:3000/api/graphql`,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/check',
    payload: {
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
          world: String
        }
      `,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      success: true,
      data: {
        isBreaking: false,
        report: [
          {
            level: 'NON_BREAKING',
            type: 'FIELD_ADDED',
            message: "Field 'world' was added to object type 'Query'",
            path: 'Query.world',
          },
        ],
      },
    },
    'response payload match',
  )
})

test('Should detect a breaking change', async (t) => {
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
          world: String
        }
      `,
      version: '1',
      routingUrl: `http://${t.context.testPrefix}_foo:3000/api/graphql`,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/check',
    payload: {
      typeDefs: trimDoc/* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      success: true,
      data: {
        isBreaking: true,
        report: [
          {
            reason:
              'Removing a field is a breaking change. It is preferable to deprecate the field before removing it.',
            level: 'BREAKING',
            type: 'FIELD_REMOVED',
            message: "Field 'world' was removed from object type 'Query'",
            path: 'Query.world',
          },
        ],
      },
    },
    'response payload match',
  )
})

test('Should return 400 because type_def is missing', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/check',
    payload: {
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 400)
  t.deepEqual(
    res.json(),
    {
      success: false,
      error: "body should have required property 'typeDefs'",
    },
    'message',
  )
})

test('Should return an empty diff when no other services exists', async (t) => {
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
      version: '3',
      routingUrl: `http://${t.context.testPrefix}_foo:3000/api/graphql`,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/check',
    payload: {
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String
        }
      `,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)
  t.deepEqual(
    res.json(),
    {
      success: true,
      data: {
        isBreaking: false,
        report: [],
      },
    },
    'message',
  )
})
