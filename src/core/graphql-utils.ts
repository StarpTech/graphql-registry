import { stripIgnoredCharacters } from 'graphql'

export function normalizeSchema(typeDefs: string): string {
  // TODO sort fields and types
  return stripIgnoredCharacters(typeDefs)
}
