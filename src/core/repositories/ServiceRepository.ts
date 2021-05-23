import { Knex } from 'knex'
import { GraphDBModel } from '../models/graphModel'
import { ServiceDBModel } from '../models/serviceModel'

export default class ServiceRepository {
  private knex: Knex
  constructor(knex: Knex) {
    this.knex = knex
  }
  findFirst({ graphName, name }: { graphName: string; name: string }) {
    const knex = this.knex
    const table = ServiceDBModel.table
    return knex
      .from(table)
      .join(
        GraphDBModel.table,
        ServiceDBModel.fullName('graphId'),
        '=',
        GraphDBModel.fullName('id'),
      )
      .where({
        [GraphDBModel.fullName('isActive')]: true,
        [GraphDBModel.fullName('name')]: graphName,
        [ServiceDBModel.fullName('name')]: name,
      })
      .select(`${table}.*`)
      .first<ServiceDBModel>()
  }
  findByRoutingUrl({ graphName, routingUrl }: { graphName: string; routingUrl: string }) {
    const knex = this.knex
    const table = ServiceDBModel.table
    return knex
      .from(table)
      .join(
        GraphDBModel.table,
        ServiceDBModel.fullName('graphId'),
        '=',
        GraphDBModel.fullName('id'),
      )
      .where({
        [GraphDBModel.fullName('isActive')]: true,
        [GraphDBModel.fullName('name')]: graphName,
        [ServiceDBModel.fullName('routingUrl')]: routingUrl,
      })
      .select(`${table}.*`)
      .first<ServiceDBModel>()
  }
  findByNames(
    { graphName }: { graphName: string },
    serviceNames: string[],
  ): Promise<ServiceDBModel[]> {
    const knex = this.knex
    const table = ServiceDBModel.table
    return knex
      .from(table)
      .select([`${table}.*`])
      .join(
        GraphDBModel.table,
        ServiceDBModel.fullName('graphId'),
        '=',
        GraphDBModel.fullName('id'),
      )
      .where({
        [GraphDBModel.fullName('isActive')]: true,
        [GraphDBModel.fullName('name')]: graphName,
        [ServiceDBModel.fullName('isActive')]: true,
      })
      .whereIn(ServiceDBModel.fullName('name'), serviceNames)
      .orderBy(ServiceDBModel.fullName('updatedAt'), 'desc')
  }
  findManyExceptWithName(
    { graphName }: { graphName: string },
    exceptService: string,
  ): Promise<ServiceDBModel[]> {
    const knex = this.knex
    const table = ServiceDBModel.table
    return knex
      .from<ServiceDBModel>(table)
      .select([`${table}.*`])
      .join(
        GraphDBModel.table,
        ServiceDBModel.fullName('graphId'),
        '=',
        GraphDBModel.fullName('id'),
      )
      .where({
        [GraphDBModel.fullName('isActive')]: true,
        [GraphDBModel.fullName('name')]: graphName,
        [ServiceDBModel.fullName('isActive')]: true,
      })
      .whereNot(ServiceDBModel.fullName('name'), exceptService)
      .orderBy(ServiceDBModel.fullName('updatedAt'), 'desc')
  }
  findMany(
    { graphName }: { graphName: string },
    where: Partial<ServiceDBModel> = {},
  ): Promise<ServiceDBModel[]> {
    const knex = this.knex
    const table = ServiceDBModel.table
    return knex
      .from(table)
      .select([`${table}.*`])
      .join(
        GraphDBModel.table,
        ServiceDBModel.fullName('graphId'),
        '=',
        GraphDBModel.fullName('id'),
      )
      .where(where)
      .where({
        [GraphDBModel.fullName('isActive')]: true,
        [GraphDBModel.fullName('name')]: graphName,
        [ServiceDBModel.fullName('isActive')]: true,
      })
      .orderBy(ServiceDBModel.fullName('updatedAt'), 'desc')
  }
  async create(entity: Omit<ServiceDBModel, 'id' | 'createdAt'>) {
    const knex = this.knex
    const table = ServiceDBModel.table

    const [first] = await knex(table)
      .insert({
        ...entity,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning<ServiceDBModel[]>('*')

    return first
  }
  async deleteByGraphId(graphId: number) {
    const knex = this.knex
    const table = ServiceDBModel.table
    return await knex(table)
      .where(ServiceDBModel.field('graphId'), graphId)
      .delete()
      .returning<Pick<ServiceDBModel, 'id'>[]>(ServiceDBModel.field('id'))
  }
  async updateOne(
    what: Partial<ServiceDBModel>,
    where: Partial<ServiceDBModel>,
  ): Promise<ServiceDBModel | undefined> {
    const knex = this.knex
    const table = ServiceDBModel.table
    const [first] = await knex(table)
      .update(what)
      .where(where)
      .limit(1)
      .returning<ServiceDBModel[]>('*')
    return first
  }
}
