import { GraphQLError, parse } from 'graphql'
import { composeAndValidate } from '@apollo/federation'

export interface ServiceSchema {
  typeDefs: string
  name: string
  url?: string
}

export function composeAndValidateSchema(servicesSchemaMap: ServiceSchema[]) {
  let schema
  let errors: GraphQLError[] = []

  try {
    const serviceList = servicesSchemaMap.map((schema) => {
      let typeDefs

      typeDefs = parse(schema.typeDefs)

      return {
        name: schema.name,
        url: '',
        typeDefs,
      }
    })

    const {
      schema: validatedSchema,
      errors: validationErrors,
    } = composeAndValidate(serviceList)
    schema = validatedSchema
    errors = validationErrors || []
  } catch (error) {
    errors = [error]
  }

  return { schema, errors }
}
