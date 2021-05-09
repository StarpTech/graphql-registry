import { Knex } from 'knex'
import { GraphDBModel } from '../models/graphModel'
import { ServiceDBModel } from '../models/serviceModel'

export default class ServiceRepository {
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findFirst({ graphName, name }: { graphName: string; name: string }) {
    const knex = this.#knex
    const table = ServiceDBModel.table
    return knex
      .from(table)
      .join(`${GraphDBModel.table}`, function () {
        this.on(`${table}.graphId`, '=', `${GraphDBModel.fullName('id')}`)
          .andOn(`${GraphDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.fullName('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceDBModel.fullName('name')}`, knex.raw('?', name))
      .select(`${table}.*`)
      .first<ServiceDBModel>()
  }
  findByNames(
    { graphName }: { graphName: string },
    serviceNames: string[],
  ): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = ServiceDBModel.table
    return knex
      .from(table)
      .select([`${table}.*`])
      .join(`${GraphDBModel.table}`, function () {
        this.on(`${ServiceDBModel.fullName('graphId')}`, '=', `${GraphDBModel.fullName('id')}`)
          .andOn(`${GraphDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.fullName('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceDBModel.fullName('isActive')}`, knex.raw('?', true))
      .whereIn(`${ServiceDBModel.fullName('name')}`, serviceNames)
      .orderBy(`${ServiceDBModel.fullName('updatedAt')}`, 'desc')
  }
  findManyExceptWithName(
    { graphName }: { graphName: string },
    exceptService: string,
  ): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = ServiceDBModel.table
    return knex
      .from<ServiceDBModel>(table)
      .select([`${table}.*`])
      .join(`${GraphDBModel.table}`, function () {
        this.on(`${ServiceDBModel.fullName('graphId')}`, '=', `${GraphDBModel.table}.id`)
          .andOn(`${GraphDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.fullName('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceDBModel.fullName('isActive')}`, knex.raw('?', true))
      .whereNot(`${ServiceDBModel.fullName('name')}`, exceptService)
      .orderBy(`${ServiceDBModel.fullName('updatedAt')}`, 'desc')
  }
  findMany({ graphName }: { graphName: string }): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = ServiceDBModel.table
    return knex
      .from(table)
      .select([`${table}.*`])
      .join(`${GraphDBModel.table}`, function () {
        this.on(`${ServiceDBModel.fullName('graphId')}`, '=', `${GraphDBModel.fullName('id')}`)
          .andOn(`${GraphDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.fullName('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceDBModel.fullName('isActive')}`, knex.raw('?', true))
      .orderBy(`${ServiceDBModel.fullName('updatedAt')}`, 'desc')
  }
  async create(entity: Omit<ServiceDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = ServiceDBModel.table

    const [first] = await knex(table)
      .insert({
        ...entity,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning<ServiceDBModel[]>('*')

    return first
  }
  async deleteByGraphId(graphId: number) {
    const knex = this.#knex
    const table = ServiceDBModel.table
    return await knex(table)
      .where(ServiceDBModel.field('graphId'), graphId)
      .delete()
      .returning<Pick<ServiceDBModel, 'id'>[]>(ServiceDBModel.field('id'))
  }
}
