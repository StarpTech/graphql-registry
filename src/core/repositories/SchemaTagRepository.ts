import Knex from 'knex'
import { SchemaDBModel } from '../models/schemaModel'
import { SchemaTagDBModel } from '../models/schemaTagModel'

export default class SchemaTagRepository {
  private knex: Knex
  constructor(knex: Knex) {
    this.knex = knex
  }
  findFirst(what: Partial<SchemaTagDBModel>) {
    const knex = this.knex
    const table = SchemaTagDBModel.table
    return knex.from(table).where(what).first<SchemaTagDBModel | undefined>()
  }
  async create(entity: Omit<SchemaTagDBModel, 'id' | 'createdAt'>) {
    const knex = this.knex
    const table = SchemaTagDBModel.table
    const [first] = await knex(table)
      .insert({
        ...entity,
        createdAt: new Date(),
      })
      .returning<SchemaTagDBModel[]>('*')

    return first
  }
  async deleteBySchemaId(schemaId: number) {
    const knex = this.knex
    const table = SchemaTagDBModel.table
    return await knex(table)
      .where(SchemaTagDBModel.field('schemaId'), schemaId)
      .delete()
      .returning<Pick<SchemaTagDBModel, 'id'>[]>(SchemaTagDBModel.field('id'))
  }
  async update(what: Partial<SchemaTagDBModel>, where: Partial<SchemaTagDBModel>) {
    const knex = this.knex
    const table = SchemaTagDBModel.table
    return knex(table).update(what).where(where).returning<SchemaDBModel[]>('*')
  }
}
