import test from 'ava'
import { key_item } from '../repositories/PersistedQueries'
import { NewNamespace, Request, Response } from '../test-utils'
import { getPersistedQuery } from './get-persisted-query'

test.serial('Should load PQ from KV', async (t) => {
  NewNamespace(
    {
      name: 'PERSISTED_QUERIES',
    },
    new Map([[key_item('123'), '123']]),
  )
  const req = Request('GET', 'key=123')
  const res = Response()
  await getPersistedQuery(req, res)
  t.is(res.statusCode, 200)
  t.deepEqual(res.body as any, {
    success: true,
    data: '123',
  })
})

test.serial('Should return 404 when key does not exist', async (t) => {
  NewNamespace({
    name: 'PERSISTED_QUERIES',
  })

  const req = Request('GET', 'key=123')
  const res = Response()
  await getPersistedQuery(req, res)
  t.is(res.statusCode, 404)
  t.deepEqual(res.body as any, {
    success: false,
    error: 'Could not find persisted query',
  })
})

test.serial('Should return 400 on invalid request', async (t) => {
  const req = Request('GET', 'key=')
  const res = Response()
  await getPersistedQuery(req, res)
  t.is(res.statusCode, 400)
  t.deepEqual(res.body as any, {
    success: false,
    error: 'No key was provided',
  })
})
