import { SchemaTag } from '@prisma/client'
import { SchemaDBModel } from './models/schemaModel'

export type SchemaResponseModel = {
  schemaId: number
  serviceName: string
  typeDefs: string
  version: string
} & Pick<SchemaTag, 'version'>

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

export type LastUpdatedSchema = Pick<SchemaTag, 'version'> & Pick<SchemaDBModel, 'id' | 'typeDefs'>
