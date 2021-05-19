import { stripIgnoredCharacters } from 'graphql'

export function normalize(typeDefs: string): string {
  return stripIgnoredCharacters(typeDefs)
}
