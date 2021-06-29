export class SchemaDBModel {
  id!: number
  typeDefs!: string
  hash!: string
  isActive?: boolean
  createdAt!: Date
  updatedAt?: Date
  graphId!: number
  serviceId!: number

  static table = 'schema'
  static fullName = (name: keyof SchemaDBModel) => SchemaDBModel.table + '.' + name
  static field = (name: keyof SchemaDBModel) => name
}
