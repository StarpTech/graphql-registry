import test from 'ava'
import { createEmptyKVNamespaces, Request, Response } from '../test-utils'
import {
  GarbageCollectResponseModel,
  SchemaResponseModel,
  SuccessResponse,
} from '../types'
import { garbageCollectSchemas } from './garbage-collect'
import { getComposedSchema } from './get-composed-schema'
import { registerSchema } from './register-schema'

test.serial(
  'Should keep the most recent 10 schemas of every servcie in the graph',
  async (t) => {
    createEmptyKVNamespaces(['GRAPHS', 'SERVICES', 'SCHEMAS', 'VERSIONS'])

    for (let i = 0; i < 15; i++) {
      let req = Request('POST', '', {
        type_defs: `type Query { hello${i}: String }`,
        version: i.toString(),
        service_name: `foo`,
        graph_name: 'my_graph',
      })
      let res = Response()
      await registerSchema(req, res)
      t.is(res.statusCode, 200)

      req = Request('POST', '', {
        type_defs: `type Query { world${i}: String }`,
        version: i.toString(),
        service_name: `bar`,
        graph_name: 'my_graph',
      })
      res = Response()
      await registerSchema(req, res)
      t.is(res.statusCode, 200)
    }

    let req = Request('POST', '', {
      num_schemas_keep: 10,
    })
    let res = Response()
    await garbageCollectSchemas(req, res)

    t.is(res.statusCode, 200)

    const result = (res.body as any) as SuccessResponse<
      GarbageCollectResponseModel[]
    >

    t.is(result.success, true)
    t.is(result.data.length, 10) // removed 5 schemas per service

    t.truthy(result.data[0].schemaId)
    t.is(result.data[0].service_name, 'foo')
    t.is(result.data[0].graph_name, 'my_graph')

    t.truthy(result.data[6].schemaId)
    t.is(result.data[6].service_name, 'bar')
    t.is(result.data[6].graph_name, 'my_graph')

    req = Request('GET', 'graph_name=my_graph')
    res = Response()
    await getComposedSchema(req, res)

    t.is(res.statusCode, 200)

    const composed = (res.body as any) as SuccessResponse<SchemaResponseModel[]>

    t.is(composed.success, true)
    t.is(composed.data.length, 2)

    t.is(composed.data[0].version, '14')
    t.is(composed.data[0].service_name, 'foo')

    t.is(composed.data[1].version, '14')
    t.is(composed.data[1].service_name, 'bar')
  },
)
