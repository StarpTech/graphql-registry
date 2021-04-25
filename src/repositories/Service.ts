import * as DB from 'worktop/kv'
import type { KV } from 'worktop/kv'

// cloudflare global kv binding
declare const SERVICES: KV.Namespace

export interface Service {
  name: string
  is_active: boolean
  updated_at: number | null
  created_at: number
}

export type NewService = Omit<Service, 'name' | 'created_at' | 'updated_at'>

export const key_owner = (graphName: string) => `graphs::${graphName}::services`
export const key_item = (graphName: string, serviceName: string) =>
  `graphs::${graphName}::services::${serviceName}`

export function find(graphName: string, serviceName: string) {
  const key = key_item(graphName, serviceName)
  return DB.read<Service>(SERVICES, key, 'json')
}

export async function list(graphName: string) {
  const key = key_owner(graphName)
  return (await DB.read<Service['name'][]>(SERVICES, key)) || []
}

export function sync(graphName: string, ids: string[]) {
  const key = key_owner(graphName)
  return DB.write(SERVICES, key, ids)
}

export function save(graphName: string, serviceName: string, item: Service) {
  const key = key_item(graphName, serviceName)
  return DB.write(SERVICES, key, item)
}

export async function insert(
  graphName: string,
  serviceName: string,
  service: NewService,
) {
  const exists = await find(graphName, serviceName)

  if (exists) {
    return false
  }

  const values: Service = {
    ...service,
    name: serviceName,
    is_active: service.is_active,
    created_at: Date.now(),
    updated_at: null,
  }

  if (!(await save(graphName, serviceName, values))) {
    return false
  }

  let allServices = (await list(graphName)).concat(serviceName)

  if (!(await sync(graphName, allServices))) {
    return false
  }

  return values
}
