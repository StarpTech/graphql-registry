import { SchemaVersion } from '@prisma/client'

export type SchemaResponseModel = {
  schemaId: number
  serviceName: string
  typeDefs: string
  version: string
} & Pick<SchemaVersion, 'version'>

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
