import { composeAndValidateSchema } from './federation'
import { SchemaService } from './services/Schema'
import { FastifyInstance } from 'fastify'

export default function getComposedSchema(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { graph_name: string } }>(
    '/schema/latest',
    async (req, res) => {
      const graphName = req.query['graph_name']
      if (!graphName) {
        res.code(400)
        return {
          success: false,
          error: 'No graph name was provided',
        }
      }

      const graph = await fastify.prisma.graph.findMany({
        where: {
          isActive: true,
          name: req.query.graph_name,
        },
      })
      if (!graph) {
        res.code(404)
        return {
          success: false,
          error: `Graph with name "${graphName}" does not exist`,
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
      const {
        schemas,
        error: findError,
      } = await schmemaService.findByServiceVersions(
        graphName,
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
    },
  )
}
