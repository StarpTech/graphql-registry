import anyTest, { TestInterface } from 'ava'
import build from '../build-server'
import { cleanTest, createTestContext, createTestPrefix, TestContext } from './test-util'

const test = anyTest as TestInterface<TestContext>
test.before(createTestContext())
test.beforeEach(createTestPrefix())
test.after.always('cleanup', cleanTest())

test('Should return 200', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })
  t.teardown(() => app.close())

  let res = await app.inject({
    method: 'GET',
    url: '/health',
  })

  t.is(res.statusCode, 200)
})

test('Should has a decorator to check the healthcheck of the connection', async (t) => {
  const app = build({
    databaseConnectionUrl: t.context.connectionUrl,
  })

  t.teardown(() => app.close())

  await app.ready()

  t.true(app.hasDecorator('knexHealthcheck'))
})

test('Should error because connection is invalid', async (t) => {
  const app = build({
    databaseConnectionUrl: 'postgresql://postgres:changeme@foo:5440/bar?schema=public',
  })

  t.teardown(() => app.close())

  await t.throwsAsync(() => app.ready(), { message: 'Database connection healthcheck failed' })
})
