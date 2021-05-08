import { Knex } from 'knex'
import { GraphDBModel } from '../models/graphModel'

export default class GraphRepository {
  static table = 'graph'
  static field = (name: keyof GraphDBModel) => GraphRepository.table + '.' + name
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  async exists({ name }: { name: string }) {
    const knex = this.#knex
    const table = GraphRepository.table
    const result = await knex.from(table).count('id').where('name', knex.raw('?', name)).first<{ count: number }>()

    return result.count > 0
  }
  findFirst({ name }: { name: string }) {
    const knex = this.#knex
    const table = GraphRepository.table
    return knex.from(table).where('name', knex.raw('?', name)).first<GraphDBModel>()
  }
  async create(entity: Omit<GraphDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = GraphRepository.table
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
