import anyTest, { TestInterface } from 'ava'
import build from '../../build-server'
import {
  cleanTest,
  createTestContext,
  createTestPrefix,
  TestContext,
} from '../../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should deactivate schema', async (t) => {
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
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })
  t.is(res.statusCode, 200)

  const schemaId = res.json().data.schemaId

  res = await app.inject({
    method: 'POST',
    url: '/schema/deactivate',
    payload: {
      schemaId,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/compose',
    payload: {
      graph_name: `${t.context.graphName}`,
      services: [
        {
          name: `${t.context.testPrefix}_foo`,
          version: '1',
        },
      ],
    },
  })

  t.is(res.statusCode, 400)

  t.deepEqual(
    res.json(),
    {
      error: `Service "${t.context.testPrefix}_foo" has no schema in version "1" registered`,
      success: false,
    },
    'response payload match',
  )
})

test('Should return 400 when schema does not exist', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/deactivate',
    payload: {
      schemaId: 123,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 400)

  t.deepEqual(
    res.json(),
    {
      error: 'Could not find schema with id "123"',
      success: false,
    },
    'response payload match',
  )
})
