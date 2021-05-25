import { ChangeType, coverage, CriticalityLevel, diff } from '@graphql-inspector/core'
import { GraphQLSchema, Source, stripIgnoredCharacters } from 'graphql'

export function normalizeSchema(typeDefs: string): string {
  // TODO sort fields and types
  return stripIgnoredCharacters(typeDefs)
}

export function getChangeSet(previous: GraphQLSchema, current: GraphQLSchema) {
  const changes = diff(previous, current)

  const changesReport = []
  let breakingChangeAdded = false
  let deprecationAdded = false

  for (const change of changes) {
    if (change.criticality.level === CriticalityLevel.Breaking) {
      breakingChangeAdded = true
    }
    if (change.type === ChangeType.FieldDeprecationAdded) {
      deprecationAdded = true
    }

    changesReport.push({
      type: change.type,
      message: change.message,
      level: change.criticality.level,
      path: change.path,
      reason: change.criticality.reason,
    })
  }

  return {
    breakingChangeAdded,
    deprecationAdded,
    changes: changesReport,
  }
}

export function getSchemaCoverage(schema: GraphQLSchema, sources: Source[]) {
  return coverage(schema, sources)
}
