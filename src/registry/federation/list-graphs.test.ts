import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import { cleanTest, createTestContext, createTestPrefix, TestContext } from '../../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should return all registered graphs', async (t) => {
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
      version: '1',
      serviceName: `${t.context.testPrefix}_bar`,
      graphName: `${t.context.graphName}_2`,
    },
  })
  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/graphs',
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      success: true,
      data: [`${t.context.graphName}`, `${t.context.graphName}_2`],
    },
    'response payload match',
  )
})
