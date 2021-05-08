export class SchemaDBModel {
  id!: number
  typeDefs!: string
  isActive?: boolean
  createdAt!: Date
  updatedAt?: Date
  graphId!: number
  serviceId!: number

  static table = 'schema'
  static field = (name: keyof SchemaDBModel) => SchemaDBModel.table + '.' + name
}
