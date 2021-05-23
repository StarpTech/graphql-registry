import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import { cleanTest, createTestContext, createTestPrefix, TestContext } from '../../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should keep the most recent 10 schemas of every service in the graph', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  for (let i = 0; i < 15; i++) {
    let res = await app.inject({
      method: 'POST',
      url: '/schema/push',
      payload: {
        typeDefs: `type Query { hello${i}: String }`,
        version: '1',
        routingUrl: `http://${t.context.testPrefix}_bar:3000/api/graphql`,
        serviceName: `${t.context.testPrefix}_foo`,
        graphName: `${t.context.graphName}`,
      },
    })

    t.is(res.statusCode, 200)
    res = await app.inject({
      method: 'POST',
      url: '/schema/push',
      payload: {
        typeDefs: `type Query { world${i}: String }`,
        version: '1',
        routingUrl: `http://${t.context.testPrefix}_foo:3000/api/graphql`,
        serviceName: `${t.context.testPrefix}_bar`,
        graphName: `${t.context.graphName}`,
      },
    })
    t.is(res.statusCode, 200)
  }

  let res = await app.inject({
    method: 'POST',
    url: '/schema/garbage_collect',
    payload: {
      numSchemasKeep: 10,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      success: true,
      data: {
        deletedSchemas: 20,
        deletedVersions: 20,
      },
    },
    'response payload match',
  )
})
