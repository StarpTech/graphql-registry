import tap from 'tap'
import { key_item } from '../repositories/PersistedQueries'
import { NewNamespace, Request, Response } from '../test-utils'
import { getPersistedQuery } from './get-persisted-query'

tap.test('Read Persisted Queries', (t) => {
  t.test('Should load PQ from KV', async (t) => {
    NewNamespace(
      {
        name: 'PERSISTED_QUERIES',
      },
      [
        {
          key: key_item('123'),
          value: '123',
        },
      ],
    )

    const req = Request('GET', 'key=123')
    const res = Response()
    await getPersistedQuery(req, res)
    t.equal(res.statusCode, 200)
    t.same(res.body, {
      success: true,
      data: 123,
    })
    t.end()
  })

  t.test('Should return 404 when key does not exist', async (t) => {
    NewNamespace(
      {
        name: 'PERSISTED_QUERIES',
      },
      [],
    )

    const req = Request('GET', 'key=123')
    const res = Response()
    await getPersistedQuery(req, res)
    t.equal(res.statusCode, 404)
    t.same(res.body, {
      success: false,
      error: 'Could not find persisted query',
    })
    t.end()
  })

  t.test('Should return 400 on invalid request', async (t) => {
    const req = Request('GET', 'key=')
    const res = Response()
    await getPersistedQuery(req, res)
    t.equal(res.statusCode, 400)
    t.same(res.body, {
      success: false,
      error: 'No key was provided',
    })
    t.end()
  })
  t.end()
})
