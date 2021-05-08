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
        this.on(`${table}.graphId`, '=', `${GraphDBModel.field('id')}`)
          .andOn(`${GraphDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.field('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceDBModel.field('name')}`, knex.raw('?', name))
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
        this.on(`${ServiceDBModel.field('graphId')}`, '=', `${GraphDBModel.field('id')}`)
          .andOn(`${GraphDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.field('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceDBModel.field('isActive')}`, knex.raw('?', true))
      .whereIn(`${ServiceDBModel.field('name')}`, serviceNames)
      .orderBy(`${ServiceDBModel.field('updatedAt')}`, 'desc')
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
        this.on(`${ServiceDBModel.field('graphId')}`, '=', `${GraphDBModel.table}.id`)
          .andOn(`${GraphDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.field('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceDBModel.field('isActive')}`, knex.raw('?', true))
      .whereNot(`${ServiceDBModel.field('name')}`, exceptService)
      .orderBy(`${ServiceDBModel.field('updatedAt')}`, 'desc')
  }
  findMany({ graphName }: { graphName: string }): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = ServiceDBModel.table
    return knex
      .from(table)
      .select([`${table}.*`])
      .join(`${GraphDBModel.table}`, function () {
        this.on(`${ServiceDBModel.field('graphId')}`, '=', `${GraphDBModel.field('id')}`)
          .andOn(`${GraphDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.field('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceDBModel.field('isActive')}`, knex.raw('?', true))
      .orderBy(`${ServiceDBModel.field('updatedAt')}`, 'desc')
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
}
