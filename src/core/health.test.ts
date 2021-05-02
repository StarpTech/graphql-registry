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
  t.teardown(() => app.prisma.$disconnect())

  let res = await app.inject({
    method: 'GET',
    url: '/health',
  })

  t.is(res.statusCode, 200)
})
