import anyTest, { TestInterface } from 'ava'
import build from '../build-server'
import { cleanTest, createTestContext, createTestPrefix, TestContext } from './test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should return 200 because credentials are valid', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
    basicAuth: '123',
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { world: String }`,
      version: '2',
      routingUrl: `http://${t.context.testPrefix}_foo:3000/api/graphql`,
      serviceName: `${t.context.testPrefix}_bar`,
      graphName: `${t.context.graphName}`,
    },
    headers: {
      authorization: 'Basic MTIzOjEyMw==', // 123
    },
  })

  t.is(res.statusCode, 200)
})

test('Should support multiple secrets comma separated', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
    basicAuth: '123,456',
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      typeDefs: `type Query { world: String }`,
      version: '3',
      routingUrl: `http://${t.context.testPrefix}_foo:3000/api/graphql`,
      serviceName: `${t.context.testPrefix}_bar`,
      graphName: `${t.context.graphName}`,
    },
    headers: {
      authorization: 'Basic NDU2OjQ1Ng==', // 456
    },
  })

  t.is(res.statusCode, 200)
})

test('Should return 401 because credentials are invalid', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
    basicAuth: '123',
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
  })

  t.is(res.statusCode, 401)
})
