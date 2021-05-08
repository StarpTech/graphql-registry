import { Knex } from 'knex'
import { GraphDBModel } from '../models/graphModel'
import { SchemaDBModel } from '../models/schemaModel'
import { SchemaTagDBModel } from '../models/schemaTagModel'
import { ServiceDBModel } from '../models/serviceModel'
import { LastUpdatedSchema } from '../types'

export default class SchemaRepository {
  #knex: Knex
  constructor(knex: Knex) {
    this.#knex = knex
  }
  findById(id: number) {
    const knex = this.#knex
    const table = SchemaDBModel.table
    return knex
      .from(table)
      .where(`${SchemaDBModel.field('isActive')}`, knex.raw('?', true))
      .where(`${SchemaDBModel.field('id')}`, knex.raw('?', id))
      .first<SchemaDBModel>()
  }
  findFirst({
    graphName,
    typeDefs,
    serviceName,
  }: {
    graphName: string
    typeDefs: string
    serviceName: string
  }) {
    const knex = this.#knex
    const table = SchemaDBModel.table
    return knex
      .from(table)
      .join(`${GraphDBModel.table}`, function () {
        this.on(`${SchemaDBModel.field('graphId')}`, '=', `${GraphDBModel.field('id')}`)
          .andOn(`${GraphDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.field('name')}`, '=', knex.raw('?', graphName))
      })
      .join(`${ServiceDBModel.table}`, function () {
        this.on(`${SchemaDBModel.field('serviceId')}`, '=', `${ServiceDBModel.field('id')}`)
          .andOn(`${ServiceDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${ServiceDBModel.field('name')}`, '=', knex.raw('?', serviceName))
      })
      .where(`${SchemaDBModel.field('typeDefs')}`, knex.raw('?', typeDefs))
      .select(`${table}.*`)
      .first<SchemaDBModel>()
  }
  findLastUpdated({ serviceName, graphName }: { graphName: string; serviceName: string }) {
    const knex = this.#knex
    const table = SchemaDBModel.table
    return knex
      .from(table)
      .select([
        `${SchemaDBModel.field('id')}`,
        `${SchemaDBModel.field('typeDefs')}`,
        `${SchemaTagDBModel.field('version')}`,
      ])
      .join(`${GraphDBModel.table}`, function () {
        this.on(`${SchemaDBModel.field('graphId')}`, '=', `${GraphDBModel.field('id')}`)
          .andOn(`${GraphDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.field('name')}`, '=', knex.raw('?', graphName))
      })
      .join(`${ServiceDBModel.table}`, function () {
        this.on(`${SchemaDBModel.field('serviceId')}`, '=', `${ServiceDBModel.field('id')}`)
          .andOn(`${ServiceDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${ServiceDBModel.field('name')}`, '=', knex.raw('?', serviceName))
      })
      .join(`${SchemaTagDBModel.table}`, function () {
        this.on(`${SchemaDBModel.field('id')}`, '=', `${SchemaTagDBModel.field('schemaId')}`).andOn(
          `${SchemaTagDBModel.field('isActive')}`,
          '=',
          knex.raw('?', true),
        )
      })
      .where(`${SchemaDBModel.field('isActive')}`, knex.raw('?', true))
      .orderBy([
        { column: `${SchemaDBModel.field('updatedAt')}`, order: 'desc' },
        { column: `${SchemaTagDBModel.field('createdAt')}`, order: 'desc' },
      ])
      .first<LastUpdatedSchema>()
  }
  findBySchemaTag({
    graphName,
    version,
    serviceName,
  }: {
    graphName: string
    version: string
    serviceName: string
  }) {
    const knex = this.#knex
    const table = SchemaDBModel.table
    return knex
      .from(table)
      .join(`${GraphDBModel.table}`, function () {
        this.on(`${SchemaDBModel.field('graphId')}`, '=', `${GraphDBModel.field('id')}`)
          .andOn(`${GraphDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.field('name')}`, '=', knex.raw('?', graphName))
      })
      .join(`${ServiceDBModel.table}`, function () {
        this.on(`${SchemaDBModel.field('serviceId')}`, '=', `${ServiceDBModel.field('id')}`)
          .andOn(`${ServiceDBModel.field('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${ServiceDBModel.field('name')}`, '=', knex.raw('?', serviceName))
      })
      .join(`${SchemaTagDBModel.table}`, function () {
        this.on(`${SchemaDBModel.field('id')}`, '=', `${SchemaTagDBModel.field('id')}`)
          .andOn(`${SchemaTagDBModel.table}.isActive`, '=', knex.raw('?', true))
          .andOn(`${SchemaTagDBModel.table}.version`, '=', knex.raw('?', version))
      })
      .where(`${SchemaDBModel.field('isActive')}`, knex.raw('?', true))
      .select(`${table}.*`)
      .first<SchemaDBModel>()
  }
  async create(entity: Omit<SchemaDBModel, 'id' | 'createdAt'>) {
    const knex = this.#knex
    const table = SchemaDBModel.table
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
    const table = SchemaDBModel.table
    return knex(table)
      .update(entity)
      .where(`${SchemaDBModel.field('id')}`, '=', schemaId)
      .returning<SchemaDBModel[]>('*')
  }
}
