import anyTest, { TestInterface } from 'ava'
import { join } from 'path'
import { execSync } from 'child_process'
import us from 'unique-string'
import build from '../build'

const test = anyTest as TestInterface<{
  dbName: string
  graph: string
  connectionUrl: string
}>

const prismaBinary = join(process.cwd(), 'node_modules', '.bin', 'prisma')

test.before(async (t) => {
  t.context = {
    connectionUrl: '',
    graph: '',
    dbName: `test_${us()}`,
  }

  t.context.connectionUrl = `postgresql://postgres:changeme@localhost:5440/${t.context.dbName}?schema=public`

  execSync(
    `docker exec -t postgres_container psql -U postgres -c 'create database ${t.context.dbName};'`,
  )
  execSync(
    `DATABASE_URL=${t.context.connectionUrl} ${prismaBinary} db push --preview-feature --skip-generate`,
  )
})

test.beforeEach(async (t) => {
  t.context.graph = `graph_${us()}`
})

test.after.always('cleanup', (t) => {
  execSync(
    `docker exec -t postgres_container psql -U postgres -c 'drop database ${t.context.dbName};'`,
  )
})

test.serial('Should register new schema', async (t) => {
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

test.serial(
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
