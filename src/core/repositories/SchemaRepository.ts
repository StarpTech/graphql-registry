import { Knex } from 'knex'
import { SchemaDBModel } from '../models/schemaModel'
import { LastUpdatedSchema } from '../types'
import GraphRepository from './GraphRepository'
import SchemaTagRepository from './SchemaTagRepository'
import ServiceRepository from './ServiceRepository'

export default class SchemaRepository {
  static table = 'schema'
  static field = (name: keyof SchemaDBModel) => SchemaRepository.table + '.' + name
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findById(id: number) {
    const knex = this.#knex
    const table = SchemaRepository.table
    return knex
      .from(table)
      .where(`${SchemaRepository.field('isActive')}`, knex.raw('?', true))
      .where(`${SchemaRepository.field('id')}`, knex.raw('?', id))
      .first<SchemaDBModel>()
  }
  findFirst({ graphName, typeDefs, serviceName }: { graphName: string; typeDefs: string; serviceName: string }) {
    const knex = this.#knex
    const table = SchemaRepository.table
    return knex
      .from(table)
      .join(`${GraphRepository.table}`, function () {
        this.on(`${SchemaRepository.field('graphId')}`, '=', `${GraphRepository.field('id')}`)
          .andOn(`${GraphRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphRepository.field('name')}`, '=', knex.raw('?', graphName))
      })
      .join(`${ServiceRepository.table}`, function () {
        this.on(`${SchemaRepository.field('serviceId')}`, '=', `${ServiceRepository.field('id')}`)
          .andOn(`${ServiceRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${ServiceRepository.field('name')}`, '=', knex.raw('?', serviceName))
      })
      .where(`${SchemaRepository.field('typeDefs')}`, knex.raw('?', typeDefs))
      .select(`${table}.*`)
      .first<SchemaDBModel>()
  }
  findLastUpdated({ serviceName, graphName }: { graphName: string; serviceName: string }) {
    const knex = this.#knex
    const table = SchemaRepository.table
    return knex
      .from(table)
      .select([
        `${SchemaRepository.field('id')}`,
        `${SchemaRepository.field('typeDefs')}`,
        `${SchemaTagRepository.field('version')}`,
      ])
      .join(`${GraphRepository.table}`, function () {
        this.on(`${SchemaRepository.field('graphId')}`, '=', `${GraphRepository.field('id')}`)
          .andOn(`${GraphRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphRepository.field('name')}`, '=', knex.raw('?', graphName))
      })
      .join(`${ServiceRepository.table}`, function () {
        this.on(`${SchemaRepository.field('serviceId')}`, '=', `${ServiceRepository.field('id')}`)
          .andOn(`${ServiceRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${ServiceRepository.field('name')}`, '=', knex.raw('?', serviceName))
      })
      .join(`${SchemaTagRepository.table}`, function () {
        this.on(`${SchemaRepository.field('id')}`, '=', `${SchemaTagRepository.field('schemaId')}`).andOn(
          `${SchemaTagRepository.field('isActive')}`,
          '=',
          knex.raw('?', true),
        )
      })
      .where(`${SchemaRepository.field('isActive')}`, knex.raw('?', true))
      .orderBy([
        { column: `${SchemaRepository.field('updatedAt')}`, order: 'desc' },
        { column: `${SchemaTagRepository.field('createdAt')}`, order: 'desc' },
      ])
      .first<LastUpdatedSchema>()
  }
  findBySchemaTag({ graphName, version, serviceName }: { graphName: string; version: string; serviceName: string }) {
    const knex = this.#knex
    const table = SchemaRepository.table
    return knex
      .from(table)
      .join(`${GraphRepository.table}`, function () {
        this.on(`${SchemaRepository.field('graphId')}`, '=', `${GraphRepository.field('id')}`)
          .andOn(`${GraphRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphRepository.field('name')}`, '=', knex.raw('?', graphName))
      })
      .join(`${ServiceRepository.table}`, function () {
        this.on(`${SchemaRepository.field('serviceId')}`, '=', `${ServiceRepository.field('id')}`)
          .andOn(`${ServiceRepository.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${ServiceRepository.field('name')}`, '=', knex.raw('?', serviceName))
      })
      .join(`${SchemaTagRepository.table}`, function () {
        this.on(`${SchemaRepository.field('id')}`, '=', `${SchemaTagRepository.field('id')}`)
          .andOn(`${SchemaTagRepository.table}.isActive`, '=', knex.raw('?', true))
          .andOn(`${SchemaTagRepository.table}.version`, '=', knex.raw('?', version))
      })
      .where(`${SchemaRepository.field('isActive')}`, knex.raw('?', true))
      .select(`${table}.*`)
      .first<SchemaDBModel>()
  }
  async create(entity: Omit<SchemaDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = SchemaRepository.table
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
    const table = SchemaRepository.table
    return knex(table)
      .update(entity)
      .where(`${SchemaRepository.field('id')}`, '=', schemaId)
      .returning<SchemaDBModel[]>('*')
  }
}
