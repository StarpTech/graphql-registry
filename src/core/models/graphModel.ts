export class GraphDBModel {
  id!: number
  name!: string
  isActive?: boolean
  createdAt!: Date
  updatedAt?: Date

  static table = 'graph'
  static field = (name: keyof GraphDBModel) => GraphDBModel.table + '.' + name
}
