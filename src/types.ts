import { Schema } from './repositories/Schema'
import { SchemaVersion } from './repositories/SchemaVersion'

export type SchemaResponseModel = Schema & Pick<SchemaVersion, 'version'>

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
