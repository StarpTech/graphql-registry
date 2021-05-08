import { Knex } from 'knex'
import { SchemaTagDBModel } from '../models/schemaTagModel'
import SchemaRepository from './SchemaRepository'

export default class SchemaTagRepository {
  static table = 'schema_tag'
  static field = (name: keyof SchemaTagDBModel) => SchemaTagRepository.table + '.' + name
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findByVersion({ version, schemaId }: { version: string; schemaId: number; serviceId: number }) {
    const knex = this.#knex
    const table = SchemaTagRepository.table
    return knex
      .from(table)
      .join(`${SchemaRepository.table}`, function () {
        this.on(`${SchemaTagRepository.field('schemaId')}`, '=', knex.raw('?', schemaId)).andOn(
          `${SchemaRepository.field('isActive')}`,
          '=',
          knex.raw('?', true),
        )
      })
      .where(`${SchemaTagRepository.field('version')}`, knex.raw('?', version))
      .select(`${table}.*`)
      .first<SchemaTagDBModel>()
  }
  async create(entity: Omit<SchemaTagDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = SchemaTagRepository.table
    const [first] = await knex(table)
      .insert({
        ...entity,
        createdAt: new Date(),
      })
      .returning<SchemaTagDBModel[]>('*')

    return first
  }
}
