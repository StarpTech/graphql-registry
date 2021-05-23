import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import { cleanTest, createTestContext, createTestPrefix, TestContext } from '../../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should validate schema as valid', async (t) => {
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
    url: '/schema/validate',
    payload: {
      typeDefs: /* GraphQL */ `
        type Query {
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
    },
    'response payload match',
  )
})

test('Should validate schema as invalid', async (t) => {
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
    url: '/schema/validate',
    payload: {
      typeDefs: /* GraphQL */ `
        type Query {
          hello: String22
        }
      `,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 400)

  t.deepEqual(
    res.json(),
    {
      success: false,
      error: 'Error: Unknown type: "String22".',
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
    url: '/schema/validate',
    payload: {
      version: '1',
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

test('Should 400 when graph could not be found', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/validate',
    payload: {
      typeDefs: /* GraphQL */ `
        type Query {
          world: String
        }
      `,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 400)

  t.deepEqual(
    res.json(),
    {
      success: false,
      error: `Graph with name "${t.context.graphName}" does not exist`,
    },
    'response payload match',
  )
})
