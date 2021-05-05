export type SchemaDBModel = {
  id: number
  typeDefs: string
  isActive?: boolean
  createdAt: Date
  updatedAt?: Date
  graphId: number
  serviceId: number
}
