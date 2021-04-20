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

export const key_owner = () => `services`
export const key_item = (serviceName: string) => `services::${serviceName}`

export function find(serviceName: string) {
  const key = key_item(serviceName)
  return DB.read<Service>(SERVICES, key, 'json')
}

export async function list() {
  const key = key_owner()
  return (await DB.read<Service['name'][]>(SERVICES, key)) || []
}

export function sync(ids: string[]) {
  const key = key_owner()
  return DB.write(SERVICES, key, ids)
}

export function save(serviceName: string, item: Service) {
  const key = key_item(serviceName)
  return DB.write(SERVICES, key, item)
}

export async function insert(serviceName: string, service: NewService) {
  const exists = await find(serviceName)

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

  if (!(await save(serviceName, values))) {
    return false
  }

  let allServices = (await list()).concat(serviceName)

  if (!(await sync(allServices))) {
    return false
  }

  return values
}
