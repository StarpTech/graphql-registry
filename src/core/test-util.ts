import { ExecutionContext } from 'ava'
import execa from 'execa'
import { join } from 'path'
import us from 'unique-string'
import jwt from 'jsonwebtoken'

export interface TestContext {
  dbName: string
  testPrefix: string
  graphName: string
  bootstrapped: boolean
  connectionUrl: string
}

export function getJwtHeader(issuerServices: string[]) {
  const jwtSecret = 'secret'
  const jwtToken = jwt.sign({ services: issuerServices }, jwtSecret)
  return {
    authorization: `Bearer ${jwtToken}`,
  }
}

export function createTestContext() {
  const knexBinary = join(process.cwd(), 'node_modules', '.bin', 'knex')

  return async (t: ExecutionContext<TestContext>) => {
    t.timeout(20000, 'make sure database has bootstrapped')

    t.context = {
      bootstrapped: false,
      connectionUrl: '',
      graphName: '',
      testPrefix: '',
      dbName: `test_${us()}`,
    }

    t.context.connectionUrl = `postgresql://postgres:changeme@localhost:5440/${t.context.dbName}?schema=public`

    await execa.command(`docker exec -t postgres createdb -U postgres ${t.context.dbName}`, {
      shell: true,
    })

    await execa.command(
      `${knexBinary} migrate:up --knexfile build/knexfile.js 20210504193054_initial_schema.js`,
      {
        shell: true,
        env: {
          DATABASE_URL: t.context.connectionUrl,
        },
      },
    )

    t.context.bootstrapped = true
  }
}

export function createTestPrefix() {
  return (t: ExecutionContext<TestContext>) => {
    t.context.testPrefix = us()
    t.context.graphName = `${t.context.testPrefix}_graph`
  }
}

export function cleanTest() {
  return async (t: ExecutionContext<TestContext>) => {
    t.timeout(20000, 'make sure database has deleted')

    if (t.context.bootstrapped) {
      await execa.command(
        `docker exec -t postgres psql -U postgres -c 'drop database ${t.context.dbName};'`,
        {
          shell: true,
        },
      )
    }
  }
}
