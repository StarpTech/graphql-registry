import { Knex } from 'knex'
import { GraphDBModel } from '../models/graphModel'

export default class GraphRepository {
  #table = 'graph'
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findFirst({ name }: { name: string }) {
    const knex = this.#knex
    return knex
      .from(this.#table)
      .where('isActive', knex.raw('?', true))
      .where('name', knex.raw('?', name))
      .first<GraphDBModel>()
  }
  async create(entity: Omit<GraphDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = this.#table

    const [first] = await knex(table)
      .insert({
        ...entity,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning<GraphDBModel[]>('*')

    return first
  }
}
