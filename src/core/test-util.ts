import { ExecutionContext } from 'ava'
import { execSync } from 'child_process'
import { join } from 'path'
import us from 'unique-string'

export interface TestContext {
  dbName: string
  testPrefix: string
  graphName: string
  connectionUrl: string
}

export function createTestContext() {
  const prismaBinary = join(process.cwd(), 'node_modules', '.bin', 'prisma')

  return async (t: ExecutionContext<TestContext>) => {
    t.context = {
      connectionUrl: '',
      graphName: '',
      testPrefix: '',
      dbName: `test_${us()}`,
    }

    t.context.connectionUrl = `postgresql://postgres:changeme@localhost:5440/${t.context.dbName}?schema=public`

    execSync(
      `DATABASE_URL=${t.context.connectionUrl} ${prismaBinary} db push --preview-feature --skip-generate`,
    )
  }
}

export function createTestPrefix() {
  return (t: ExecutionContext<TestContext>) => {
    t.context.testPrefix = `${us()}`
    t.context.graphName = `${t.context.testPrefix}_graph`
  }
}

export function cleanTest() {
  return (t: ExecutionContext<TestContext>) => {
    execSync(
      `docker exec -t postgres_container psql -U postgres -c 'drop database ${t.context.dbName};'`,
    )
  }
}
