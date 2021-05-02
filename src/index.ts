import build from './build-server'
import envSchema from 'env-schema'
import appSchema from './core/env.schema'

const config = envSchema({
  schema: appSchema,
})

const app = build({
  databaseConnectionUrl: config.DATABASE_URL as string,
  basicAuth: config.BASIC_AUTH as string,
  jwtSecret: config.JWT_SECRET as string,
})

app.listen(3000, '0.0.0.0', (err, address) => {
  if (err) throw err
  console.log(`Server listening at ${address}`)
})
