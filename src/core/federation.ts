import { GraphQLSchema, parse } from 'graphql'
import { composeAndValidate } from '@apollo/federation'

export interface ServiceSchema {
  typeDefs: string
  name: string
  url?: string
}

export interface CompositionResult {
  error: string | null
  schema: GraphQLSchema | null
  supergraphSdl: string | undefined
}

export function composeAndValidateSchema(servicesSchemaMap: ServiceSchema[]): CompositionResult {
  let result: CompositionResult = {
    error: null,
    schema: null,
    supergraphSdl: '',
  }

  try {
    const serviceList = servicesSchemaMap.map((schema) => {
      let typeDefs

      typeDefs = parse(schema.typeDefs)

      return {
        name: schema.name,
        url: schema.url,
        typeDefs,
      }
    })

    const { schema, errors, supergraphSdl } = composeAndValidate(serviceList)
    if (!!errors) {
      result.error = `${errors[0]}`
      return result
    }
    result.schema = schema
    result.supergraphSdl = supergraphSdl
  } catch (err) {
    result.error = `${err.message}`
  }

  return result
}
