import { stripIgnoredCharacters } from 'graphql'

export function normalizeSchema(typeDefs: string): string {
  return stripIgnoredCharacters(typeDefs)
}
