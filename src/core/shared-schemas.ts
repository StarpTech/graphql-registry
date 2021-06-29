import S from 'fluent-json-schema'

export const serviceName = S.string().minLength(1).maxLength(100).pattern('[a-zA-Z_\\-0-9]+')
export const graphName = S.string().minLength(1).maxLength(100).pattern('[a-zA-Z_\\-0-9]+')
export const version = S.string().minLength(1).maxLength(100).pattern('[a-zA-Z_\\-0-9]+')
export const typeDefs = S.string().minLength(1).maxLength(20000)
export const schemaId = S.integer().minimum(1)
export const document = S.string().minLength(1).maxLength(10000)
export const routingUrl = S.string().minLength(1).maxLength(10000).format(S.FORMATS.URI)
export const dateTime = S.string().format(S.FORMATS.DATE_TIME)
