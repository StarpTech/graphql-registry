import { createHash } from 'crypto'

export function hash(data: string) {
  return createHash('sha256').update(data).digest('hex')
}
