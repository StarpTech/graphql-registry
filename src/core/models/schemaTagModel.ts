export class SchemaTagDBModel {
  id!: number
  version!: string
  isActive?: boolean
  createdAt!: Date
  schemaId!: number

  static table = 'schema_tag'
  static fullName = (name: keyof SchemaTagDBModel) => SchemaTagDBModel.table + '.' + name
  static field = (name: keyof SchemaTagDBModel) => name
}
