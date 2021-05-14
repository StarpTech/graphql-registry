import { Knex } from 'knex'
import { GraphDBModel } from '../models/graphModel'

export default class GraphRepository {
  private knex: Knex
  constructor(knex: Knex) {
    this.knex = knex
  }
  async exists({ name }: { name: string }) {
    const knex = this.knex
    const table = GraphDBModel.table
    const result = await knex
      .from(table)
      .count(GraphDBModel.fullName('id'))
      .where(GraphDBModel.fullName('name'), name)
      .first<{ count: number }>()

    return result.count > 0
  }
  findFirst({ name }: { name: string }) {
    const knex = this.knex
    const table = GraphDBModel.table
    return knex
      .from(table)
      .where(GraphDBModel.fullName('name'), name)
      .first<GraphDBModel | undefined>()
  }
  async create(entity: Omit<GraphDBModel, 'id' | 'createdAt'>) {
    const knex = this.knex
    const table = GraphDBModel.table
    const [first] = await knex(table)
      .insert({
        ...entity,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning<GraphDBModel[]>('*')

    return first
  }
  async deleteByName(name: string) {
    const knex = this.knex
    const table = GraphDBModel.table
    return knex(table)
      .where(GraphDBModel.field('name'), name)
      .delete()
      .returning<Pick<GraphDBModel, 'id'>[]>(GraphDBModel.field('id'))
  }
}
