import build from './build'

const app = build({
  databaseConnectionUrl: process.env.DATABASE_URL!,
})

app.listen(3000, (err, address) => {
  if (err) throw err
  console.log(`Server listening at ${address}`)
})
