import anyTest, { TestInterface } from 'ava'
import build from '../build'
import { cleanTest, createTestContext, TestContext } from '../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.beforeEach(createTestContext())
test.afterEach.always('cleanup', cleanTest())

test('Should register new schema', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: 'foo',
      graph_name: t.context.graph,
    },
  })

  t.is(res.statusCode, 200)
  t.deepEqual(
    res.json(),
    {
      data: {
        serviceName: 'foo',
        typeDefs: `type Query { hello: String }`,
        version: '1',
      },
      success: true,
    },
    'response payload match',
  )
})

test(
  'Should not create multiple schemas when client and type_defs does not change',
  async (t) => {
    const app = build({
      databaseConnectionUrl: t.context.connectionUrl,
    })
    t.teardown(() => app.prisma.$disconnect())

    let res = await app.inject({
      method: 'POST',
      url: '/schema/push',
      payload: {
        type_defs: `type Query { hello: String }`,
        version: '1',
        service_name: 'foo',
        graph_name: t.context.graph,
      },
    })

    t.is(res.statusCode, 200)

    res = await app.inject({
      method: 'POST',
      url: '/schema/push',
      payload: {
        type_defs: `type Query { hello: String }`,
        version: '2',
        service_name: 'foo',
        graph_name: t.context.graph,
      },
    })

    t.is(res.statusCode, 200)

    res = await app.inject({
      method: 'GET',
      url: '/schema/latest',
      query: {
        graph_name: t.context.graph,
      },
    })

    t.is(res.statusCode, 200)

    t.deepEqual(
      res.json(),
      {
        data: [
          {
            serviceName: 'foo',
            typeDefs: `type Query { hello: String }`,
            version: '2',
          },
        ],
        success: true,
      },
      'response payload match',
    )
  },
)
