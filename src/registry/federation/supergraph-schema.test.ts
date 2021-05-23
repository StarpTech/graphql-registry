import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import { cleanTest, createTestContext, createTestPrefix, TestContext } from '../../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should return supergraph of two services', async (t) => {
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
      routingUrl: `http://supergraph_svc_foo:3000/api/graphql`,
      serviceName: `supergraph_svc_foo`,
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
      routingUrl: 'http://supergraph_svc_bar:3001/api/graphql',
      serviceName: `supergraph_svc_bar`,
      graphName: `${t.context.graphName}`,
    },
  })
  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/supergraph',
    payload: {
      graphName: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)

  t.snapshot(response.data, 'supergraph composition')
})
