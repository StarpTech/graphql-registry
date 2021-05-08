export class ServiceDBModel {
  id!: number
  name!: string
  isActive?: boolean
  createdAt!: Date
  updatedAt?: Date
  graphId!: number

  static table = 'service'
  static field = (name: keyof ServiceDBModel) => ServiceDBModel.table + '.' + name
}
