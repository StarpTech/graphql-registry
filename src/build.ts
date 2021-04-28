import fastify from 'fastify'
import federationPlugin from './federation'
import prismaPlugin from './core/prisma-plugin'

export interface buildOptions {
}

export default function build(opts: buildOptions = {}) {
  const app = fastify()

  app.register(prismaPlugin)

  // Federation
  app.register(federationPlugin)

  return app
}
