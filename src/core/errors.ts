import createError from 'fastify-error'

export const InvalidServiceScopeError = createError(
  'GR_INSUFFICIENT_SERVICE_SCOPE',
  `You are not authorized to access service "%s"`,
  401,
)
export const DuplicateServiceUrlError = createError(
  'GR_DUPLICATE_SERVICE_URL',
  `Service "%s" already use the routingUrl "%s"`,
  400,
)
export const InvalidGraphNameError = createError(
  'GR_INVALID_GRAPH_NAME',
  `Graph with name "%s" does not exist`,
  400,
)
export const SchemaCompositionError = createError('GR_SCHEMA_COMPOSITION', `%s`, 400)
export const SchemaVersionLookupError = createError('GR_SCHEMA_VERSION_LOOKUP', `%s`, 400)
export const SupergraphCompositionError = createError('GR_SUPERGRAPH_COMPOSITION', `%s`, 400)
export const SchemaNotFoundError = createError(
  'GR_SCHEMA_NOT_FOUND',
  `Could not find schema with id "%s"`,
  400,
)
export const InvalidDocumentError = createError(
  'GR_DOCUMENT_INVALID',
  `Could not parse document`,
  400,
)
export const FatalError = createError('GR_FATAL', `%s`, 500)
