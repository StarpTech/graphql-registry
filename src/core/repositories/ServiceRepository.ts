import { Knex } from 'knex'
import { ServiceDBModel } from '../models/serviceModel'
import GraphRepository from './GraphRepository'

export default class ServiceRepository {
  static table = 'service'
  static field = (name: keyof ServiceDBModel) => ServiceRepository.table + '.' + name
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findFirst({ graphName, name }: { graphName: string; name: string }) {
    const knex = this.#knex
    const table = ServiceRepository.table
    return knex
      .from(table)
      .join(`${GraphRepository.table}`, function () {
        this.on(`${table}.graphId`, '=', `${GraphRepository.field('id')}`)
          .andOn(`${GraphRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphRepository.field('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceRepository.field('name')}`, knex.raw('?', name))
      .select(`${table}.*`)
      .first<ServiceDBModel>()
  }
  findByNames({ graphName }: { graphName: string }, serviceNames: string[]): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = ServiceRepository.table
    return knex
      .from(table)
      .select([`${table}.*`])
      .join(`${GraphRepository.table}`, function () {
        this.on(`${ServiceRepository.field('graphId')}`, '=', `${GraphRepository.field('id')}`)
          .andOn(`${GraphRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphRepository.field('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceRepository.field('isActive')}`, knex.raw('?', true))
      .whereIn(`${ServiceRepository.field('name')}`, serviceNames)
      .orderBy(`${ServiceRepository.field('updatedAt')}`, 'desc')
  }
  findManyExceptWithName({ graphName }: { graphName: string }, exceptService: string): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = ServiceRepository.table
    return knex
      .from<ServiceDBModel>(table)
      .select([`${table}.*`])
      .join(`${GraphRepository.table}`, function () {
        this.on(`${ServiceRepository.field('graphId')}`, '=', `${GraphRepository.table}.id`)
          .andOn(`${GraphRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphRepository.field('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceRepository.field('isActive')}`, knex.raw('?', true))
      .whereNot(`${ServiceRepository.field('name')}`, exceptService)
      .orderBy(`${ServiceRepository.field('updatedAt')}`, 'desc')
  }
  findMany({ graphName }: { graphName: string }): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = ServiceRepository.table
    return knex
      .from(table)
      .select([`${table}.*`])
      .join(`${GraphRepository.table}`, function () {
        this.on(`${ServiceRepository.field('graphId')}`, '=', `${GraphRepository.field('id')}`)
          .andOn(`${GraphRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphRepository.field('name')}`, '=', knex.raw('?', graphName))
      })
      .where(`${ServiceRepository.field('isActive')}`, knex.raw('?', true))
      .orderBy(`${ServiceRepository.field('updatedAt')}`, 'desc')
  }
  async create(entity: Omit<ServiceDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = ServiceRepository.table

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
