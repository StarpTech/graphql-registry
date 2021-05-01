import build from './build'

const app = build({
  databaseConnectionUrl: process.env.DATABASE_URL!,
  basicAuthSecrets: process.env.BASIC_AUTH_SECRETS!
})

app.listen(3000, (err, address) => {
  if (err) throw err
  console.log(`Server listening at ${address}`)
})
