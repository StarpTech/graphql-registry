import anyTest, { TestInterface } from 'ava'
import build from '../build'
import {
  cleanTest,
  createTestContext,
  createTestPrefix,
  TestContext,
} from '../core/test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

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
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)
  t.deepEqual(
    res.json(),
    {
      data: {
        graphName: t.context.graphName,
        serviceName: `${t.context.testPrefix}_foo`,
        typeDefs: `type Query { hello: String }`,
        version: '1',
      },
      success: true,
    },
    'response payload match',
  )
})

test('Should not create multiple schemas when client and type_defs does not change', async (t) => {
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
      type_defs: `type Query { hello: String }`,
      version: '2',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      data: [
        {
          serviceName: `${t.context.testPrefix}_foo`,
          typeDefs: `type Query { hello: String }`,
          version: '2',
        },
      ],
      success: true,
    },
    'response payload match',
  )
})

test('Should be able to register schemas from multiple clients', async (t) => {
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
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: `${t.context.graphName}`,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      data: [
        {
          serviceName: `${t.context.testPrefix}_bar`,
          typeDefs: `type Query { world: String }`,
          version: '2',
        },
        {
          serviceName: `${t.context.testPrefix}_foo`,
          typeDefs: `type Query { hello: String }`,
          version: '1',
        },
      ],
      success: true,
    },
    'response payload match',
  )
})

test('Should not be able to push invalid schema', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `foo`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 400)
})

test('Should be able to store multiple versions with the same schema and client combination', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { world: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { world: String }`,
      version: '2',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      data: [
        {
          serviceName: `${t.context.testPrefix}_foo`,
          typeDefs: `type Query { world: String }`,
          version: '2',
        },
      ],
      success: true,
    },
    'response payload match',
  )
})

test('Should reject schema because it is not compatible with registry state', async (t) => {
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
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: `type Query { hello: String }`,
      version: '1',
      service_name: `${t.context.testPrefix}_bar`,
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 400)
  t.true(
    res.json().error.includes('Field "Query.hello" can only be defined once.'),
  )
})

test.only('Should return correct latest service schema with multiple graphs', async (t) => {
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
      type_defs: `type Query { hello: String }`,
      version: '2',
      service_name: `${t.context.testPrefix}_foo`,
      graph_name: `${t.context.graphName}_2`,
    },
  })

  t.is(res.statusCode, 200)

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: t.context.graphName,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      data: [
        {
          serviceName: `${t.context.testPrefix}_foo`,
          typeDefs: `type Query { hello: String }`,
          version: '1',
        },
      ],
      success: true,
    },
    'response payload match',
  )

  res = await app.inject({
    method: 'GET',
    url: '/schema/latest',
    query: {
      graph_name: `${t.context.graphName}_2`,
    },
  })

  t.is(res.statusCode, 200)

  t.deepEqual(
    res.json(),
    {
      data: [
        {
          serviceName: `${t.context.testPrefix}_foo`,
          typeDefs: `type Query { hello: String }`,
          version: '2',
        },
      ],
      success: true,
    },
    'response payload match',
  )
})
