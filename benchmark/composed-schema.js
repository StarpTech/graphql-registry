import http from 'k6/http'
import { check, fail } from 'k6'

export let options = {
  vus: 2,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(99)<500'], // 99% of requests must complete below 0.5s
  },
}
const BASE_URL = `${__ENV.URL}`

const requestOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
}

export function setup() {
  let data = {
    typeDefs: 'type Query { hello: String }',
    version: '1',
    routingUrl: `http://foo:3000/api/graphql`,
    graphName: 'my_graph',
    serviceName: 'foo',
  }
  let res = http.post(`${BASE_URL}/schema/push`, JSON.stringify(data), requestOptions)

  if (
    !check(res, {
      'returns success': (resp) => resp.json('success'),
    })
  ) {
    fail('could not push schema')
  }

  data = {
    typeDefs: 'type Query { world: String }',
    version: '1',
    routingUrl: 'http://bar:3001/api/graphql',
    graphName: 'my_graph',
    serviceName: 'bar',
  }
  res = http.post(`${BASE_URL}/schema/push`, JSON.stringify(data), requestOptions)

  if (
    !check(res, {
      'returns success': (resp) => resp.json('success'),
    })
  ) {
    fail('could not push schema')
  }
}

export default () => {
  const data = {
    graphName: 'my_graph',
    services: [
      { name: 'foo', version: '1' },
      { name: 'bar', version: '1' },
    ],
  }
  const res = http.post(`${BASE_URL}/schema/compose`, JSON.stringify(data), requestOptions)

  check(res, {
    'returns success': (resp) => resp.json('success'),
    'returns 2 schemas': (resp) => resp.json('data').length === 2,
  })
}
