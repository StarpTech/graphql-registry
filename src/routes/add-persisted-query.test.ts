import test from 'ava'
import { addPersistedQuery } from './add-persisted-query'
import { NewNamespace, Request, Response } from '../test-utils'

test.serial('Should store PQ from KV', async (t) => {
  const store = NewNamespace({
    name: 'PERSISTED_QUERIES',
  })

  const req = Request('POST', '', { key: '123', query: 'query' })
  const res = Response()
  await addPersistedQuery(req, res)
  t.is(res.statusCode, 200)
  t.deepEqual(res.body as any, {
    success: true,
  })
  t.deepEqual(store, new Map([['pq::123', 'query']]))
})
test.serial(
  'Should return validation error because no query was provided',
  async (t) => {
    const store = NewNamespace({
      name: 'PERSISTED_QUERIES',
    })

    const req = Request('POST', '', { key: '123' })
    const res = Response()
    await addPersistedQuery(req, res)

    t.is(res.statusCode, 400)
    t.deepEqual(res.body as any, {
      success: false,
      error: 'At path: query -- Expected a string, but received: undefined',
    })
    t.deepEqual(store, new Map())
  },
)
test.serial('Should accept ttl values', async (t) => {
  const store = NewNamespace({
    name: 'PERSISTED_QUERIES',
  })

  const req = Request('POST', '', {
    key: '123',
    query: 'query',
    ttl: 300,
    expiration: Date.now(),
  })
  const res = Response()
  await addPersistedQuery(req, res)
  t.is(res.statusCode, 200)
  t.deepEqual(res.body as any, {
    success: true,
  })
  t.deepEqual(store, new Map([['pq::123', 'query']]))
})
