import * as DB from 'worktop/kv'
import type { KV } from 'worktop/kv'

// cloudflare global kv binding
declare const GRAPHS: KV.Namespace

export interface Graph {
  name: string
  is_active: boolean
  updated_at: number | null
  created_at: number
}

export type NewGraph = Omit<Graph, 'created_at' | 'updated_at' | 'uid'>

export const key_owner = () => `graphs`
export const key_item = (name: string) => `graphs::${name}`

export function find(name: string) {
  const key = key_item(name)
  return DB.read<Graph>(GRAPHS, key, 'json')
}

export async function list(): Promise<Graph['name'][]> {
  const key = key_owner()
  return (await DB.read<Graph['name'][]>(GRAPHS, key, 'json')) || []
}

export function syncIndex(versions: string[]) {
  const key = key_owner()
  return DB.write(GRAPHS, key, versions)
}

export function remove(name: string) {
  const key = key_item(name)
  return DB.remove(GRAPHS, key)
}

export function save(item: Graph) {
  const key = key_item(item.name)
  return DB.write(GRAPHS, key, item)
}

export async function insert(graph: NewGraph) {
  const values: Graph = {
    name: graph.name,
    is_active: graph.is_active,
    created_at: Date.now(),
    updated_at: null,
  }

  if (!(await save(values))) {
    return false
  }

  let allGraphs = (await list()).concat(values.name)

  if (!(await syncIndex(allGraphs))) {
    return false
  }

  return values
}
