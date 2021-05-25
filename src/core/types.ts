import { SchemaDBModel } from './models/schemaModel'
import { SchemaTagDBModel } from './models/schemaTagModel'

export type SchemaResponseModel = {
  schemaId: number
  serviceName: string
  routingUrl?: string
  typeDefs: string
  version: string
  lastUpdatedAt: Date | undefined
} & Pick<SchemaTagDBModel, 'version'>

export type ResponseModel = {
  success: boolean
}

export type SuccessResponse<T> = {
  success: true
  data: T
}
export type ErrorResponse = {
  success: false
  error?: string
}

export interface ServiceVersionMatch {
  name: string
  version: string
}

export type LastUpdatedSchema = Pick<SchemaTagDBModel, 'version'> &
  Pick<SchemaDBModel, 'id' | 'typeDefs' | 'updatedAt'>
