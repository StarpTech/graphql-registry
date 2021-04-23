import test from 'ava'
import { NewNamespace, Request, Response } from '../test-utils'
import { addPersistedQuery } from './add-persisted-query'
import { getPersistedQuery } from './get-persisted-query'
import { deletePersistedQuery } from './delete-persisted-query'

test.serial('Should delete PQ from KV', async (t) => {
  NewNamespace({
    name: 'PERSISTED_QUERIES',
  })

  let req = Request('POST', '', { key: '123', query: 'query' })
  let res = Response()
  await addPersistedQuery(req, res)
  t.is(res.statusCode, 200)

  req = Request('GET', 'key=123')
  res = Response()
  await getPersistedQuery(req, res)
  t.is(res.statusCode, 200)
  t.deepEqual(res.body as any, {
    success: true,
    data: 'query',
  })

  req = Request('DELETE', '', { key: '123' })
  res = Response()
  await deletePersistedQuery(req, res)
  t.is(res.statusCode, 200)

  req = Request('GET', 'key=123')
  res = Response()
  await getPersistedQuery(req, res)
  t.is(res.statusCode, 404)
})

test.serial('Should return 400 when key was not provided', async (t) => {
  NewNamespace({
    name: 'PERSISTED_QUERIES',
  })

  const req = Request('DELETE', '', {})
  const res = Response()
  await deletePersistedQuery(req, res)
  t.is(res.statusCode, 400)
})
