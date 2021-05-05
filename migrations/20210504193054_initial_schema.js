/**
 *
 * @param {import("knex").Knex} knex
 * @returns
 */
exports.up = (knex) => {
  return knex.schema
    .createTable('graph', (table) => {
      table.increments('id').primary().notNullable()

      table.string('name').unique().notNullable()
      table.boolean('isActive').notNullable().defaultTo(true)
      table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
    })
    .createTable('service', (table) => {
      table.increments('id').primary()

      table.string('name')
      table.boolean('isActive').notNullable().defaultTo(true)
      table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())

      table.integer('graphId').unsigned().references('id').inTable('graph').index()
    })
    .createTable('schema', (table) => {
      table.increments('id').primary()

      table.string('typeDefs')
      table.boolean('isActive').notNullable().defaultTo(true)
      table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.integer('graphId').unsigned().references('id').inTable('graph').index()

      table.integer('serviceId').unsigned().references('id').inTable('service').index()
    })
    .createTable('schema_tag', (table) => {
      table.increments('id').primary()

      table.string('version')
      table.boolean('isActive').notNullable().defaultTo(true)
      table.timestamp('createdAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())
      table.timestamp('updatedAt', { useTz: true }).notNullable().defaultTo(knex.fn.now())

      table.integer('schemaId').unsigned().references('id').inTable('schema').index()
    })
}

/**
 *
 * @param {import("knex").Knex} knex
 * @returns
 */
exports.down = (knex) => {
  return knex.schema
    .raw('DROP TABLE graph CASCADE')
    .raw('DROP TABLE schema CASCADE')
    .raw('DROP TABLE schema_tag CASCADE')
    .raw('DROP TABLE service CASCADE')
}
