import build from './build'

const app = build()

app.listen(3000, (err, address) => {
  if (err) throw err
  console.log(`Server listening at ${address}`)
})
