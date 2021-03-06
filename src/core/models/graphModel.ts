export class GraphDBModel {
  id!: number
  name!: string
  isActive?: boolean
  createdAt!: Date
  updatedAt?: Date

  static table = 'graph'
  static fullName = (name: keyof GraphDBModel) => GraphDBModel.table + '.' + name
  static field = (name: keyof GraphDBModel) => name
}
