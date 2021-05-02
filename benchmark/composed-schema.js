import http from 'k6/http'
import { check, fail } from 'k6'

export let options = {
  vus: 2,
  duration: '10s',
  thresholds: {
    http_req_duration: ['p(99)<800'], // 99% of requests must complete below 0.8s
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
    type_defs: 'type Query { hello: String }',
    version: '1',
    graph_name: 'my_graph',
    service_name: 'foo',
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
    type_defs: 'type Query { world: String }',
    version: '1',
    graph_name: 'my_graph',
    service_name: 'bar',
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
    graph_name: 'my_graph',
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
