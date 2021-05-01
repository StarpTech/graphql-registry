import { composeAndValidateSchema } from '../../core/federation'
import { SchemaService } from '../../core/services/Schema'
import { FastifyInstance, FastifySchema } from 'fastify'

export const schema: FastifySchema = {
  querystring: {
    type: 'object',
    required: ['graph_name'],
    properties: {
      graph_name: { type: 'string', minLength: 1, pattern: '[a-zA-Z_\\-0-9]+' },
    },
  },
}

export default function getComposedSchema(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { graph_name: string } }>('/schema/latest', { schema }, async (req, res) => {
    const graph = await fastify.prisma.graph.findMany({
      where: {
        name: req.query.graph_name,
        isActive: true,
      },
    })
    if (!graph) {
      res.code(400)
      return {
        success: false,
        error: `Graph with name "${req.query.graph_name}" does not exist`,
      }
    }

    const serviceModels = await fastify.prisma.service.findMany({
      select: {
        name: true,
      },
    })
    const allServiceNames = serviceModels.map((s) => s.name)
    const allServiceVersions = allServiceNames.map((s) => ({
      name: s,
    }))

    if (!allServiceNames.length) {
      return res.send({
        success: true,
        data: [],
      })
    }

    const schmemaService = new SchemaService(fastify.prisma)
    const { schemas, error: findError } = await schmemaService.findByServiceVersions(
      req.query.graph_name,
      allServiceVersions,
    )

    if (findError) {
      res.code(400)
      return {
        success: false,
        error: findError.message,
      }
    }

    if (!schemas.length) {
      return res.send({
        success: true,
        data: [],
      })
    }

    const serviceSchemas = schemas.map((s) => ({
      name: s.serviceName,
      typeDefs: s.typeDefs,
    }))

    const { error: schemaError } = composeAndValidateSchema(serviceSchemas)

    if (schemaError) {
      res.code(400)
      return {
        success: false,
        error: schemaError,
      }
    }

    return {
      success: true,
      data: schemas,
    }
  })
}
