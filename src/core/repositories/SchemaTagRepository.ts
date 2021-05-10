import { Knex } from 'knex'
import { SchemaDBModel } from '../models/schemaModel'
import { SchemaTagDBModel } from '../models/schemaTagModel'

export default class SchemaTagRepository {
  private knex: Knex
  constructor(knex: Knex) {
    this.knex = knex
  }
  findByVersion({ version, schemaId }: { version: string; schemaId: number; serviceId: number }) {
    const knex = this.knex
    const table = SchemaTagDBModel.table
    return knex
      .from(table)
      .join(
        SchemaDBModel.table,
        SchemaTagDBModel.fullName('schemaId'),
        '=',
        SchemaDBModel.fullName('id'),
      )
      .where({
        [SchemaDBModel.fullName('id')]: schemaId,
        [SchemaDBModel.fullName('isActive')]: true,
        [SchemaTagDBModel.fullName('version')]: version,
      })
      .select(`${table}.*`)
      .first<SchemaTagDBModel>()
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
}
