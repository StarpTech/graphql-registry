import anyTest, { TestInterface } from 'ava'
import { join } from 'path'
import { execSync } from 'child_process'
import nuid from 'nuid'
import build from '../build'

const test = anyTest as TestInterface<{ dbName: string }>

const prismaBinary = join(process.cwd(), 'node_modules', '.bin', 'prisma')

test.before(async (t) => {
  t.context = {
    dbName: nuid.next(),
  }
  const connectionUrl = `postgresql://postgres:changeme@localhost:5440/${t.context.dbName}?schema=public`
  process.env.DATABASE_URL = connectionUrl
  execSync(
    `docker exec -t postgres_container psql -U postgres -c 'create database ${t.context.dbName};'`,
  )
  execSync(
    `DATABASE_URL=${connectionUrl} ${prismaBinary} db push --force-reset --preview-feature --skip-generate`,
  )
})

test.after('cleanup', (t) => {
  execSync(
    `docker exec -t postgres_container psql -U postgres -c 'drop database ${t.context.dbName};'`,
  )
})

test('Should register new schema', async (t) => {
  const app = build()
  t.teardown(() => app.prisma.$disconnect())

  const res = await app.inject({
    method: 'POST',
    url: '/schema/push',
    payload: {
      type_defs: 'type Query { hello: String }',
      version: '1',
      service_name: 'foo',
      graph_name: 'my_graph',
    },
  })

  t.is(res.statusCode, 200)
})
