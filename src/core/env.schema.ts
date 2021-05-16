import S from 'fluent-json-schema'

export default S.object()
  .prop('DATABASE_URL', S.string())
  .prop('BASIC_AUTH', S.string())
  .prop('JWT_SECRET', S.string())
  .prop('PRETTY_PRINT', S.boolean().default(false))
  .prop('LOGGER', S.boolean().default(true)) as any

export interface AppSchema {
  DATABASE_URL: string
  PRETTY_PRINT: boolean
  LOGGER: boolean
  BASIC_AUTH: string
  JWT_SECRET: string
}
