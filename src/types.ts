import { Schema } from './repositories/Schema'
import { SchemaVersion } from './repositories/SchemaVersion'

export type SchemaResponseModel = Schema & Pick<SchemaVersion, 'version'>

export type GarbageCollectResponseModel = {
  graph_name: string
  schemaId: string
  service_name: string
  versions: string[]
}

export type SchemaWithVersionModel = Schema & Pick<SchemaVersion, 'version'>

export type ResponseModel = {
  success: boolean
}

export type SuccessResponse<T> = {
  success: true
  data: T
}
export type ErrorResponse = {
  success: true
  error: string
}
