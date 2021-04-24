import { parse } from 'graphql'
import { composeAndValidate } from '@apollo/federation'

export interface ServiceSchema {
  typeDefs: string
  name: string
  url?: string
}

export function composeAndValidateSchema(servicesSchemaMap: ServiceSchema[]) {
  let schema
  let error = null

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
    if (validationErrors && validationErrors.length > 0) {
      error = `${validationErrors[0]}`
    }
  } catch (err) {
    error = `${err.message}`
  }

  return { schema, error }
}
