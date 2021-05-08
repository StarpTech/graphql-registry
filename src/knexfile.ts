import { join } from 'path'

export default {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  migrations: {
    extension: 'ts',
    directory: join(__dirname + '/migrations'),
  },
}
