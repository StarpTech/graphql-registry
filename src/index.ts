import build from './build-server'
import envSchema from 'env-schema'
import appSchema, { AppSchema } from './core/env.schema'

const config = envSchema({
  schema: appSchema,
}) as any as AppSchema

const app = build({
  databaseConnectionUrl: config.DATABASE_URL,
  databaseSchema: config.DATABASE_SCHEMA,
  basicAuth: config.BASIC_AUTH,
  jwtSecret: config.JWT_SECRET,
  logger: config.LOGGER,
  prettyPrint: config.PRETTY_PRINT,
})

app.listen(3000, '0.0.0.0', (err, address) => {
  if (err) throw err
  console.log(`Server listening at ${address}`)
})
