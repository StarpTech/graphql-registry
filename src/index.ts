import build from './build-server'

const app = build({
  databaseConnectionUrl: process.env.DATABASE_URL!,
  basicAuth: process.env.BASIC_AUTH!,
  jwtSecret: process.env.JWT_SECRET!,
})

app.listen(3000, '0.0.0.0', (err, address) => {
  if (err) throw err
  console.log(`Server listening at ${address}`)
})
