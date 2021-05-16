export class ServiceDBModel {
  id!: number
  name!: string
  isActive?: boolean
  createdAt!: Date
  updatedAt?: Date
  routingUrl?: string
  graphId!: number

  static table = 'service'
  static fullName = (name: keyof ServiceDBModel) => ServiceDBModel.table + '.' + name
  static field = (name: keyof ServiceDBModel) => name
}
