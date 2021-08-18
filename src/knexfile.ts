import { join } from 'path'
import dotenv from 'dotenv'

// allows to use .env for development because migrations must be compiled
dotenv.config({ path: join(__dirname, '..', '.env') })

export default {
  client: 'pg',
  connection: process.env.DATABASE_URL,
  searchPath: [process.env.DATABASE_SCHEMA || 'public'],
  migrations: {
    extension: 'ts',
    directory: join(__dirname, '/migrations'),
  },
}
