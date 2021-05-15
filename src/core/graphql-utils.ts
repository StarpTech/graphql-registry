import {
  buildSchema,
  GraphQLSchema,
  lexicographicSortSchema,
  printSchema,
  stripIgnoredCharacters,
} from 'graphql'

export function normalize(typeDefs: string): string {
  const schema = buildSchema(typeDefs)
  return stripIgnoredCharacters(printSorted(schema))
}

export function printSorted(schema: GraphQLSchema): string {
  return printSchema(lexicographicSortSchema(schema))
}
