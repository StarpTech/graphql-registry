import fastify from 'fastify'
import federationPlugin from './federation'
import prismaPlugin from './core/prisma-plugin'

export interface buildOptions {
  databaseConnectionUrl: string
}

export default function build(opts: buildOptions) {
  const app = fastify()

  app.register(prismaPlugin, {
    databaseConnectionUrl: opts.databaseConnectionUrl
  })

  // Federation
  app.register(federationPlugin)

  return app
}
