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
      .where({
        [SchemaDBModel.fullName('isActive')]: true,
        [SchemaDBModel.fullName('id')]: id,
      })
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
      .join(GraphDBModel.table, SchemaDBModel.fullName('graphId'), '=', GraphDBModel.fullName('id'))
      .join(
        ServiceDBModel.table,
        SchemaDBModel.fullName('serviceId'),
        '=',
        ServiceDBModel.fullName('id'),
      )
      .where({
        [GraphDBModel.fullName('isActive')]: true,
        [GraphDBModel.fullName('name')]: graphName,
        [ServiceDBModel.fullName('isActive')]: true,
        [ServiceDBModel.fullName('name')]: serviceName,
        [SchemaDBModel.fullName('typeDefs')]: typeDefs,
      })
      .select(`${table}.*`)
      .first<SchemaDBModel>()
  }
  findLastUpdated({ serviceName, graphName }: { graphName: string; serviceName: string }) {
    const knex = this.#knex
    const table = SchemaDBModel.table
    return knex
      .from(table)
      .select([
        SchemaDBModel.fullName('id'),
        SchemaDBModel.fullName('typeDefs'),
        SchemaTagDBModel.fullName('version'),
      ])
      .join(GraphDBModel.table, SchemaDBModel.fullName('graphId'), '=', GraphDBModel.fullName('id'))
      .join(
        ServiceDBModel.table,
        SchemaDBModel.fullName('serviceId'),
        '=',
        ServiceDBModel.fullName('id'),
      )
      .join(
        SchemaTagDBModel.table,
        SchemaDBModel.fullName('id'),
        '=',
        SchemaTagDBModel.fullName('schemaId'),
      )
      .where({
        [GraphDBModel.fullName('isActive')]: true,
        [GraphDBModel.fullName('name')]: graphName,
        [ServiceDBModel.fullName('isActive')]: true,
        [ServiceDBModel.fullName('name')]: serviceName,
        [SchemaTagDBModel.fullName('isActive')]: true,
        [SchemaDBModel.fullName('isActive')]: true,
      })
      .orderBy([
        { column: SchemaDBModel.fullName('updatedAt'), order: 'desc' },
        { column: SchemaTagDBModel.fullName('createdAt'), order: 'desc' },
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
      .join(GraphDBModel.table, SchemaDBModel.fullName('graphId'), '=', GraphDBModel.fullName('id'))
      .join(
        ServiceDBModel.table,
        SchemaDBModel.fullName('serviceId'),
        '=',
        ServiceDBModel.fullName('id'),
      )
      .join(
        SchemaTagDBModel.table,
        SchemaDBModel.fullName('id'),
        '=',
        SchemaTagDBModel.fullName('schemaId'),
      )
      .where({
        [GraphDBModel.fullName('isActive')]: true,
        [GraphDBModel.fullName('name')]: graphName,
        [ServiceDBModel.fullName('isActive')]: true,
        [ServiceDBModel.fullName('name')]: serviceName,
        [SchemaDBModel.fullName('isActive')]: true,
        [SchemaTagDBModel.fullName('isActive')]: true,
        [SchemaTagDBModel.fullName('version')]: version,
      })
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
      .where(SchemaDBModel.fullName('id'), '=', schemaId)
      .returning<SchemaDBModel[]>('*')
  }
  async deleteByGraphId(graphId: number) {
    const knex = this.#knex
    const table = GraphDBModel.table
    return await knex(table)
      .where(SchemaDBModel.field('graphId'), graphId)
      .delete()
      .returning<Pick<SchemaDBModel, 'id'>[]>(SchemaDBModel.field('id'))
  }
}
