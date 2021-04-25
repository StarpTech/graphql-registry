import encoding from 'k6/encoding'
import http from 'k6/http'
import { check } from 'k6'

export let options = {
  vus: 2,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(95)<100'], // 99% of requests must complete below 0.1s
  },
}
const BASE_URL = `${__ENV.URL}`
const username = `${__ENV.SECRET}`
const password = `${__ENV.SECRET}`

const credentials = `${username}:${password}`
const encodedCredentials = encoding.b64encode(credentials)
const requestOptions = {
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Basic ${encodedCredentials}`,
  },
}

export function setup() {
  const data = {
    key: 'foo',
    query: 'query',
  }
  const res = http.post(
    `${BASE_URL}/persisted_query`,
    JSON.stringify(data),
    requestOptions,
  )

  if (
    !check(res, {
      'returns success': (resp) => resp.json('success'),
    })
  ) {
    fail('could not create persisted query')
  }
}

export default () => {
  const res = http.get(`${BASE_URL}/persisted_query?key=foo`, requestOptions)

  check(res, {
    'returns success': (resp) => resp.json('success'),
  })
}
