import { Knex } from 'knex'
import { SchemaDBModel } from '../models/schemaModel'
import { LastUpdatedSchema } from '../types'

export default class SchemaRepository {
  #table = 'schema'
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findById(id: number) {
    const knex = this.#knex
    const table = this.#table
    return knex
      .from(this.#table)
      .where(`${table}.isActive`, knex.raw('?', true))
      .where(`${table}.id`, knex.raw('?', id))
      .first<SchemaDBModel>()
  }
  findFirst({ graphName, typeDefs, serviceName }: { graphName: string; typeDefs: string; serviceName: string }) {
    const knex = this.#knex
    const table = this.#table
    return knex
      .from(table)
      .join('graph', function () {
        this.on(`${table}.graphId`, '=', 'graph.id')
          .andOn('graph.isActive', '=', knex.raw('?', true))
          .andOn('graph.name', '=', knex.raw('?', graphName))
      })
      .join('service', function () {
        this.on(`${table}.serviceId`, '=', 'service.id')
          .andOn('service.isActive', '=', knex.raw('?', true))
          .andOn('service.name', '=', knex.raw('?', serviceName))
      })
      .where(`${table}.typeDefs`, knex.raw('?', typeDefs))
      .select(`${table}.*`)
      .first<SchemaDBModel>()
  }
  findLastUpdated({ serviceName, graphName }: { graphName: string; serviceName: string }) {
    const knex = this.#knex
    const table = this.#table
    return knex
      .from(table)
      .select([`${table}.id`, `${table}.typeDefs`, `schema_tag.version`])
      .join('graph', function () {
        this.on(`${table}.graphId`, '=', 'graph.id')
          .andOn('graph.isActive', '=', knex.raw('?', true))
          .andOn('graph.name', '=', knex.raw('?', graphName))
      })
      .join('service', function () {
        this.on(`${table}.serviceId`, '=', 'service.id')
          .andOn('service.isActive', '=', knex.raw('?', true))
          .andOn('service.name', '=', knex.raw('?', serviceName))
      })
      .leftJoin('schema_tag', function () {
        this.on(`${table}.id`, '=', 'schema_tag.schemaId').andOn('schema_tag.isActive', '=', knex.raw('?', true))
      })
      .where(`${table}.isActive`, knex.raw('?', true))
      .orderBy([
        { column: `${table}.updatedAt`, order: 'desc' },
        { column: `schema_tag.createdAt`, order: 'desc' },
      ])
      .first<LastUpdatedSchema>()
  }
  findBySchemaTag({ graphName, version, serviceName }: { graphName: string; version: string; serviceName: string }) {
    const knex = this.#knex
    const table = this.#table
    return knex
      .from(table)
      .join('graph', function () {
        this.on(`${table}.graphId`, '=', 'graph.id')
          .andOn('graph.isActive', '=', knex.raw('?', true))
          .andOn('graph.name', '=', knex.raw('?', graphName))
      })
      .join('service', function () {
        this.on(`${table}.serviceId`, '=', 'service.id')
          .andOn('service.isActive', '=', knex.raw('?', true))
          .andOn('service.name', '=', knex.raw('?', serviceName))
      })
      .join('schema_tag', function () {
        this.on(`${table}.id`, '=', 'schema_tag.id')
          .andOn('schema_tag.isActive', '=', knex.raw('?', true))
          .andOn('schema_tag.version', '=', knex.raw('?', version))
      })
      .where(`${table}.isActive`, knex.raw('?', true))
      .select(`${table}.*`)
      .first<SchemaDBModel>()
  }
  async create(entity: Omit<SchemaDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = this.#table
    const [first] = await knex<SchemaDBModel>(table)
      .insert({
        ...entity,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning('*')

    return first
  }
  async updateById(schemaId: number, entity: Partial<SchemaDBModel>) {
    const knex = this.#knex
    const table = this.#table
    return knex(table).update(entity).where(`${table}.id`, '=', schemaId).returning<SchemaDBModel[]>('*')
  }
}
