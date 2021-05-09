import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import { cleanTest, createTestContext, createTestPrefix, TestContext } from '../../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should validate document as valid', async (t) => {
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
      typeDefs: `type Query { bar: String }`,
      version: '1',
      serviceName: `${t.context.testPrefix}_bar`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/document/validate',
    payload: {
      document: `query { hello }`,
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

test('Should validate document as invalid because field does not exist', async (t) => {
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
    url: '/document/validate',
    payload: {
      document: `query { world }`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 400)

  t.deepEqual(
    res.json(),
    {
      success: false,
      error: [
        {
          source: {
            body: '{\n  world\n}\n',
            name: 'GraphQL request',
            locationOffset: { line: 1, column: 1 },
          },
          errors: [
            {
              message: 'Cannot query field "world" on type "Query".',
              locations: [{ line: 2, column: 3 }],
            },
          ],
          deprecated: [],
        },
      ],
    },
    'response payload match',
  )
})

test('Should return 400 error when graph does not exist', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  const res = await app.inject({
    method: 'POST',
    url: '/document/validate',
    payload: {
      document: `query { world }`,
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 400)

  const response = res.json()

  t.false(response.success)

  t.is(response.error, `Graph with name "${t.context.graphName}" does not exist`)
})
