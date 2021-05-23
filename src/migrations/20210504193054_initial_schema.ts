import { Knex } from 'knex'
import { GraphDBModel } from '../core/models/graphModel'
import { SchemaDBModel } from '../core/models/schemaModel'
import { SchemaTagDBModel } from '../core/models/schemaTagModel'
import { ServiceDBModel } from '../core/models/serviceModel'

export async function up(knex: Knex): Promise<void> {
  return knex.schema
    .createTable(GraphDBModel.table, (table) => {
      table.increments(GraphDBModel.field('id')).primary().notNullable()

      table.string(GraphDBModel.field('name')).unique().notNullable()
      table.boolean(GraphDBModel.field('isActive')).notNullable().defaultTo(true)
      table
        .timestamp(GraphDBModel.field('createdAt'), { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now())
      table
        .timestamp(GraphDBModel.field('updatedAt'), { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now())

      table.index([GraphDBModel.field('isActive'), GraphDBModel.field('name')])
    })
    .createTable(ServiceDBModel.table, (table) => {
      table.increments(ServiceDBModel.field('id')).primary()

      table.string(ServiceDBModel.field('name')).notNullable()
      table.boolean(ServiceDBModel.field('isActive')).notNullable().defaultTo(true)
      table.string(ServiceDBModel.field('routingUrl')).notNullable()
      table
        .timestamp(ServiceDBModel.field('createdAt'), { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now())
      table
        .timestamp(ServiceDBModel.field('updatedAt'), { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now())

      table
        .integer(ServiceDBModel.field('graphId'))
        .unsigned()
        .references(GraphDBModel.field('id'))
        .inTable(GraphDBModel.table)
        .onDelete('CASCADE')
        .index()

      table.index([ServiceDBModel.field('isActive'), ServiceDBModel.field('name')])
      table.unique([ServiceDBModel.field('graphId'), ServiceDBModel.field('name')])
      table.unique([ServiceDBModel.field('graphId'), ServiceDBModel.field('routingUrl')])
    })
    .createTable(SchemaDBModel.table, (table) => {
      table.increments(SchemaDBModel.field('id')).primary()

      table.text(SchemaDBModel.field('typeDefs'))
      table.boolean(SchemaDBModel.field('isActive')).notNullable().defaultTo(true)
      table
        .timestamp(SchemaDBModel.field('createdAt'), { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now())
      table
        .timestamp(SchemaDBModel.field('updatedAt'), { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now())
      table
        .integer(SchemaDBModel.field('graphId'))
        .unsigned()
        .references(GraphDBModel.field('id'))
        .inTable(GraphDBModel.table)
        .index()

      table
        .integer(SchemaDBModel.field('serviceId'))
        .unsigned()
        .references(ServiceDBModel.field('id'))
        .inTable(ServiceDBModel.table)
        .index()

      table.index([SchemaDBModel.field('isActive')])
      table.index([SchemaDBModel.field('typeDefs')])
    })
    .createTable(SchemaTagDBModel.table, (table) => {
      table.increments(SchemaTagDBModel.field('id')).primary()

      table.string(SchemaTagDBModel.field('version'))
      table.boolean(SchemaTagDBModel.field('isActive')).notNullable().defaultTo(true)
      table
        .timestamp(SchemaTagDBModel.field('createdAt'), { useTz: true })
        .notNullable()
        .defaultTo(knex.fn.now())

      table
        .integer(SchemaTagDBModel.field('schemaId'))
        .unsigned()
        .references(SchemaDBModel.field('id'))
        .inTable(SchemaDBModel.table)
        .index()

      table
        .integer(SchemaTagDBModel.field('serviceId'))
        .unsigned()
        .references(ServiceDBModel.field('id'))
        .inTable(ServiceDBModel.table)
        .index()

      table.index([SchemaTagDBModel.field('version')])
    })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema
    .raw(`DROP TABLE ${GraphDBModel.table} CASCADE`)
    .raw(`DROP TABLE ${SchemaDBModel.table} CASCADE`)
    .raw(`DROP TABLE ${SchemaTagDBModel.table} CASCADE`)
    .raw(`DROP TABLE ${ServiceDBModel.table} CASCADE`)
}
