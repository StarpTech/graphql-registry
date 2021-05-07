import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
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
  t.is(response.data.length, 2)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_bar`,
    typeDefs: 'type Query { world: String }',
    version: '2',
  })

  t.like(response.data[1], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: 'type Query { hello: String }',
    version: '1',
  })
})
