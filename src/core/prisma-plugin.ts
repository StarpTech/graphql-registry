import fp from 'fastify-plugin'
import { PrismaClient } from '@prisma/client'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export interface PrismaPluginOptions {
  databaseConnectionUrl: string
}

export default fp<PrismaPluginOptions>(async function (fastify, opts) {
  const prisma = new PrismaClient()

  await prisma.$connect()

  fastify.decorate('prisma', prisma)
})
