import { Knex } from 'knex'
import { SchemaDBModel } from '../models/schemaModel'
import { SchemaTagDBModel } from '../models/schemaTagModel'

export default class SchemaTagRepository {
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findByVersion({ version, schemaId }: { version: string; schemaId: number; serviceId: number }) {
    const knex = this.#knex
    const table = SchemaTagDBModel.table
    return knex
      .from(table)
      .join(`${SchemaDBModel.table}`, function () {
        this.on(`${SchemaTagDBModel.fullName('schemaId')}`, '=', knex.raw('?', schemaId)).andOn(
          `${SchemaDBModel.fullName('isActive')}`,
          '=',
          knex.raw('?', true),
        )
      })
      .where(`${SchemaTagDBModel.fullName('version')}`, knex.raw('?', version))
      .select(`${table}.*`)
      .first<SchemaTagDBModel>()
  }
  async create(entity: Omit<SchemaTagDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = SchemaTagDBModel.table
    const [first] = await knex(table)
      .insert({
        ...entity,
        createdAt: new Date(),
      })
      .returning<SchemaTagDBModel[]>('*')

    return first
  }
}
