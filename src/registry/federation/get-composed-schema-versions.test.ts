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

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { world: String }`,
      version: '2',
      service_name: `${t.context.testPrefix}_bar`,
      graph_name: `${t.context.graphName}`,
    },
  })
  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { world: String }`,
      version: '3',
      service_name: `${t.context.testPrefix}_bar`,
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
          name: `${t.context.testPrefix}_bar`,
          version: '2',
        },
      ],
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)
  t.is(response.data.length, 1)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_bar`,
    typeDefs: 'type Query { world: String }',
    version: '2',
  })
})

test('Should return latest schema when no version was specified', async (t) => {
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

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { world: String }`,
      version: '2',
      service_name: `${t.context.testPrefix}_bar`,
      graph_name: `${t.context.graphName}`,
    },
  })
  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { world: String }`,
      version: '3',
      service_name: `${t.context.testPrefix}_bar`,
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
        },
        {
          name: `${t.context.testPrefix}_bar`,
        },
      ],
    },
  })

  t.is(res.statusCode, 200)

  const response = res.json()

  t.true(response.success)
  t.is(response.data.length, 2)

  t.like(response.data[0], {
    serviceName: `${t.context.testPrefix}_foo`,
    typeDefs: 'type Query { hello: String }',
    version: '1',
  })

  t.like(response.data[1], {
    serviceName: `${t.context.testPrefix}_bar`,
    typeDefs: 'type Query { world: String }',
    version: '3',
  })
})

test('Should return 404 when schema in version could not be found', async (t) => {
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

  res = await app.inject({
    method: 'POST',
    url: '/schema/compose',
    payload: {
      graph_name: `${t.context.graphName}`,
      services: [
        {
          name: `${t.context.testPrefix}_foo`,
          version: '2',
        },
      ],
    },
  })

  t.is(res.statusCode, 400)

  t.deepEqual(
    res.json(),
    {
      error: `In graph "${t.context.graphName}", service "${t.context.testPrefix}_foo" has no schema in version "2" registered`,
      success: false,
    },
    'response payload match',
  )
})

test('Should return 400 when schema in specified version was deactivated', async (t) => {
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
      error: `In graph "${t.context.graphName}", service "${t.context.testPrefix}_foo" has no schema in version "1" registered`,
      success: false,
    },
    'response payload match',
  )
})
