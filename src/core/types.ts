import { SchemaDBModel } from './models/schemaModel'
import { SchemaTagDBModel } from './models/schemaTagModel'

export type SchemaResponseModel = {
  schemaId: number
  serviceName: string
  typeDefs: string
  version: string
} & Pick<SchemaTagDBModel, 'version'>

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

export type LastUpdatedSchema = Pick<SchemaTagDBModel, 'version'> & Pick<SchemaDBModel, 'id' | 'typeDefs'>
