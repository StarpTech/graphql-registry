import { Knex } from 'knex'
import { ServiceDBModel } from '../models/serviceModel'

export default class ServiceRepository {
  #table = 'service'
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findFirst({ graphName, name }: { graphName: string; name: string }) {
    const knex = this.#knex
    const table = this.#table
    return knex
      .from(this.#table)
      .join('graph', function () {
        this.on(`${table}.graphId`, '=', 'graph.id')
          .andOn('graph.isActive', '=', knex.raw('?', true))
          .andOn('graph.name', '=', knex.raw('?', graphName))
      })
      .where(`${table}.name`, knex.raw('?', name))
      .select(`${table}.*`)
      .first<ServiceDBModel>()
  }
  findByNames({ graphName }: { graphName: string }, serviceNames: string[]): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = this.#table
    return knex
      .from(table)
      .select([`${table}.*`])
      .join('graph', function () {
        this.on(`${table}.graphId`, '=', 'graph.id')
          .andOn('graph.isActive', '=', knex.raw('?', true))
          .andOn('graph.name', '=', knex.raw('?', graphName))
      })
      .where(`${table}.isActive`, knex.raw('?', true))
      .whereIn(`${table}.name`, serviceNames)
      .orderBy(`${table}.updatedAt`, 'desc')
  }
  findManyExceptWithName({ graphName }: { graphName: string }, exceptService: string): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = this.#table
    return knex
      .from<ServiceDBModel>(table)
      .select([`${table}.*`])
      .join('graph', function () {
        this.on(`${table}.graphId`, '=', 'graph.id')
          .andOn('graph.isActive', '=', knex.raw('?', true))
          .andOn('graph.name', '=', knex.raw('?', graphName))
      })
      .where(`${table}.isActive`, knex.raw('?', true))
      .whereNot(`${table}.name`, exceptService)
      .orderBy(`${table}.updatedAt`, 'desc')
  }
  findMany({ graphName }: { graphName: string }): Promise<ServiceDBModel[]> {
    const knex = this.#knex
    const table = this.#table
    return knex
      .from(table)
      .select([`${table}.*`])
      .join('graph', function () {
        this.on(`${table}.graphId`, '=', 'graph.id')
          .andOn('graph.isActive', '=', knex.raw('?', true))
          .andOn('graph.name', '=', knex.raw('?', graphName))
      })
      .where(`${table}.isActive`, knex.raw('?', true))
      .orderBy(`${table}.updatedAt`, 'desc')
  }
  async create(entity: Omit<ServiceDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = this.#table

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
