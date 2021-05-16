import {
  buildSchema,
  GraphQLSchema,
  lexicographicSortSchema,
  stripIgnoredCharacters,
} from 'graphql'
import { printSchemaWithDirectives } from '@graphql-tools/utils'

export function normalize(typeDefs: string): string {
  const schema = buildSchema(typeDefs, { assumeValidSDL: true })
  return stripIgnoredCharacters(printSorted(schema))
}

export function printSorted(schema: GraphQLSchema): string {
  const sorted = lexicographicSortSchema(schema)
  // without this the default implementation of "printSchema" would remove metadata like "directives"
  return printSchemaWithDirectives(sorted)
}
