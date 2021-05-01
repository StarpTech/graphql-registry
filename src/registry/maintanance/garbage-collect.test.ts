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
  t.teardown(() => app.prisma.$disconnect())

  for (let i = 0; i < 15; i++) {
    let res = await app.inject({
      method: 'POST',
      url: '/schema/push',
      payload: {
        type_defs: `type Query { hello${i}: String }`,
        version: '1',
        service_name: `${t.context.testPrefix}_foo`,
        graph_name: `${t.context.graphName}`,
      },
    })

    t.is(res.statusCode, 200)
    res = await app.inject({
      method: 'POST',
      url: '/schema/push',
      payload: {
        type_defs: `type Query { world${i}: String }`,
        version: '1',
        service_name: `${t.context.testPrefix}_bar`,
        graph_name: `${t.context.graphName}`,
      },
    })
    t.is(res.statusCode, 200)
  }

  let res = await app.inject({
    method: 'POST',
    url: '/schema/garbage_collect',
    payload: {
      num_schemas_keep: 10,
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

test('Should not be possible to delete all schemas', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/garbage_collect',
    payload: {
      num_schemas_keep: 0,
    },
  })

  t.is(res.statusCode, 400)

  t.deepEqual(
    res.json(),
    {
      error: 'body.num_schemas_keep should be >= 10',
      success: false,
    },
    'response payload match',
  )
})
