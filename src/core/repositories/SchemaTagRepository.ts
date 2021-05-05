import { Knex } from 'knex'
import { SchemaTagDBModel } from '../models/schemaTagModel'

export default class SchemaTagRepository {
  #table = 'schema_tag'
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findByVersion({ version, schemaId }: { version: string; schemaId: number; serviceId: number }) {
    const knex = this.#knex
    const table = this.#table
    return knex
      .from(table)
      .join('schema', function () {
        this.on(`${table}.schemaId`, '=', knex.raw('?', schemaId)).andOn('schema.isActive', '=', knex.raw('?', true))
      })
      .where(`${table}.version`, knex.raw('?', version))
      .select(`${table}.*`)
      .first<SchemaTagDBModel>()
  }
  async create(entity: Omit<SchemaTagDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = this.#table
    const [first] = await knex(table)
      .insert({
        ...entity,
        createdAt: new Date(),
      })
      .returning<SchemaTagDBModel[]>('*')

    return first
  }
}
