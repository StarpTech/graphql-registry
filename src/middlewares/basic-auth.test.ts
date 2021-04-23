import test from 'ava'
import { Headers, Request, Response } from '../test-utils'
import { basicAuth } from './basic-auth'

test.serial(
  'Should return 401 when allowed clients list is empty',
  async (t) => {
    // @ts-ignore
    globalThis.ALLOWED_CLIENT_SECRETS = ''
    let req = Request(
      'GET',
      '',
      null,
      Headers([['authorization', 'Basic MTIzOjEyMw==']]),
    )
    let res = Response()
    await basicAuth(req, res)

    t.is(res.statusCode, 401)
  },
)

test.serial(
  'Should return 401 when authorization header is empty',
  async (t) => {
    let req = Request('GET', '', null, Headers([['authorization', '']]))
    let res = Response()
    await basicAuth(req, res)

    t.is(res.statusCode, 401)
  },
)

test.serial('Should succeed because credentials are correct', async (t) => {
  // @ts-ignore
  globalThis.ALLOWED_CLIENT_SECRETS = '123'

  let req = Request(
    'GET',
    '',
    null,
    Headers([['authorization', 'Basic MTIzOjEyMw==']]),
  ) // 123:123
  let res = Response()
  await basicAuth(req, res)

  t.is(res.statusCode, 0)

  // @ts-ignore
  globalThis.ALLOWED_CLIENT_SECRETS = '123,456'

  req = Request(
    'GET',
    '',
    null,
    Headers([['authorization', 'Basic MTIzOjEyMw==']]),
  ) // 123:123
  res = Response()
  await basicAuth(req, res)

  t.is(res.statusCode, 0)

  req = Request(
    'GET',
    '',
    null,
    Headers([['authorization', 'Basic NDU2OjQ1Ng==']]),
  ) // 456:456
  res = Response()
  await basicAuth(req, res)

  t.is(res.statusCode, 0)
})

test.serial('Should reject because credentials are invalid', async (t) => {
  // @ts-ignore
  globalThis.ALLOWED_CLIENT_SECRETS = '123,456'

  let req = Request(
    'GET',
    '',
    null,
    Headers([['authorization', 'Basic MTExOjExMQ==']]),
  ) // 111:111
  let res = Response()
  await basicAuth(req, res)

  t.is(res.statusCode, 401)

  req = Request(
    'GET',
    '',
    null,
    Headers([['authorization', 'Basic NDU2OjQ1Ng==']]),
  ) // 456:456
  res = Response()
  await basicAuth(req, res)

  t.is(res.statusCode, 0)
})
