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

test('Should calculate the schema coverage between provided documents and latest schema', async (t) => {
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
    url: '/schema/coverage',
    payload: {
      documents: [
        {
          name: 'foo.graphql',
          source: trimDoc/* GraphQL */ `
            query {
              hello
            }
          `,
        },
      ],
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      success: true,
      data: {
        sources: [
          { body: 'query{hello}', name: 'foo.graphql', locationOffset: { line: 1, column: 1 } },
        ],
        types: {
          Query: {
            hits: 1,
            type: 'Query',
            children: { hello: { hits: 1, locations: { 'foo.graphql': [{ start: 6, end: 11 }] } } },
          },
        },
      },
    },
    'response payload match',
  )
})

test('Should calculate the schema coverage based on the set of service versions', async (t) => {
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
    url: '/schema/push',
    payload: {
      typeDefs: /* GraphQL */ `
        type Query {
          world: String
        }
      `,
      version: '2',
      routingUrl: `http://${t.context.testPrefix}_foo:3000/api/graphql`,
      serviceName: `${t.context.testPrefix}_foo`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/coverage',
    payload: {
      services: [{ name: `${t.context.testPrefix}_foo`, version: '2' }],
      documents: [
        {
          name: 'foo.graphql',
          source: trimDoc/* GraphQL */ `
            query {
              hello
            }
          `,
        },
      ],
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      success: true,
      data: {
        sources: [
          { body: 'query{hello}', name: 'foo.graphql', locationOffset: { line: 1, column: 1 } },
        ],
        types: {
          Query: { hits: 0, type: 'Query', children: { world: { hits: 0, locations: {} } } },
        },
      },
    },
    'response payload match',
  )

  res = await app.inject({
    method: 'POST',
    url: '/schema/coverage',
    payload: {
      services: [{ name: `${t.context.testPrefix}_foo`, version: '1' }],
      documents: [
        {
          name: 'foo.graphql',
          source: trimDoc/* GraphQL */ `
            query {
              hello
            }
          `,
        },
      ],
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      success: true,
      data: {
        sources: [
          { body: 'query{hello}', name: 'foo.graphql', locationOffset: { line: 1, column: 1 } },
        ],
        types: {
          Query: {
            hits: 1,
            type: 'Query',
            children: { hello: { hits: 1, locations: { 'foo.graphql': [{ start: 6, end: 11 }] } } },
          },
        },
      },
    },
    'response payload match',
  )
})
