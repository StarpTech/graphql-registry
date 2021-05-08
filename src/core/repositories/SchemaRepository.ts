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
      .where(`${SchemaDBModel.fullName('isActive')}`, knex.raw('?', true))
      .where(`${SchemaDBModel.fullName('id')}`, knex.raw('?', id))
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
        this.on(`${SchemaDBModel.fullName('graphId')}`, '=', `${GraphDBModel.fullName('id')}`)
          .andOn(`${GraphDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.fullName('name')}`, '=', knex.raw('?', graphName))
      })
      .join(`${ServiceDBModel.table}`, function () {
        this.on(`${SchemaDBModel.fullName('serviceId')}`, '=', `${ServiceDBModel.fullName('id')}`)
          .andOn(`${ServiceDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${ServiceDBModel.fullName('name')}`, '=', knex.raw('?', serviceName))
      })
      .where(`${SchemaDBModel.fullName('typeDefs')}`, knex.raw('?', typeDefs))
      .select(`${table}.*`)
      .first<SchemaDBModel>()
  }
  findLastUpdated({ serviceName, graphName }: { graphName: string; serviceName: string }) {
    const knex = this.#knex
    const table = SchemaDBModel.table
    return knex
      .from(table)
      .select([
        `${SchemaDBModel.fullName('id')}`,
        `${SchemaDBModel.fullName('typeDefs')}`,
        `${SchemaTagDBModel.fullName('version')}`,
      ])
      .join(`${GraphDBModel.table}`, function () {
        this.on(`${SchemaDBModel.fullName('graphId')}`, '=', `${GraphDBModel.fullName('id')}`)
          .andOn(`${GraphDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.fullName('name')}`, '=', knex.raw('?', graphName))
      })
      .join(`${ServiceDBModel.table}`, function () {
        this.on(`${SchemaDBModel.fullName('serviceId')}`, '=', `${ServiceDBModel.fullName('id')}`)
          .andOn(`${ServiceDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${ServiceDBModel.fullName('name')}`, '=', knex.raw('?', serviceName))
      })
      .join(`${SchemaTagDBModel.table}`, function () {
        this.on(
          `${SchemaDBModel.fullName('id')}`,
          '=',
          `${SchemaTagDBModel.fullName('schemaId')}`,
        ).andOn(`${SchemaTagDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
      })
      .where(`${SchemaDBModel.fullName('isActive')}`, knex.raw('?', true))
      .orderBy([
        { column: `${SchemaDBModel.fullName('updatedAt')}`, order: 'desc' },
        { column: `${SchemaTagDBModel.fullName('createdAt')}`, order: 'desc' },
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
        this.on(`${SchemaDBModel.fullName('graphId')}`, '=', `${GraphDBModel.fullName('id')}`)
          .andOn(`${GraphDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${GraphDBModel.fullName('name')}`, '=', knex.raw('?', graphName))
      })
      .join(`${ServiceDBModel.table}`, function () {
        this.on(`${SchemaDBModel.fullName('serviceId')}`, '=', `${ServiceDBModel.fullName('id')}`)
          .andOn(`${ServiceDBModel.fullName('isActive')}`, '=', knex.raw('?', true))
          .andOn(`${ServiceDBModel.fullName('name')}`, '=', knex.raw('?', serviceName))
      })
      .join(`${SchemaTagDBModel.table}`, function () {
        this.on(`${SchemaDBModel.fullName('id')}`, '=', `${SchemaTagDBModel.fullName('id')}`)
          .andOn(`${SchemaTagDBModel.table}.isActive`, '=', knex.raw('?', true))
          .andOn(`${SchemaTagDBModel.table}.version`, '=', knex.raw('?', version))
      })
      .where(`${SchemaDBModel.fullName('isActive')}`, knex.raw('?', true))
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
      .where(`${SchemaDBModel.fullName('id')}`, '=', schemaId)
      .returning<SchemaDBModel[]>('*')
  }
}
