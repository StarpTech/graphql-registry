const Fastify = require('fastify')
const mercurius = require('mercurius')
const { post } = require('httpie')

async function fetchServices() {
  const res = await post(`http://localhost:3000/schema/compose`, {
    body: {
      graphName: 'my_graph',
      services: [
        { name: 'accounts', version: 'current' },
        { name: 'inventory', version: 'current' },
        { name: 'products', version: 'current' },
        { name: 'reviews', version: 'current' },
      ],
    },
  })

  return res.data.data.map((svc) => {
    return {
      name: svc.serviceName,
      url: svc.routingUrl,
      schema: svc.typeDefs,
      mandatory: true,
    }
  })
}

async function startServer(services) {
  const server = Fastify()

  server.register(mercurius, {
    graphiql: 'playground',
    federationMetadata: true,
    gateway: {
      services: await fetchServices(),
    },
  })

  server.listen(3002, (err, address) => {
    if (err) throw err
    console.log(`Server is now listening on ${address}/playground`)
  })

  setTimeout(async () => {
    const services = await fetchServices()
    for (const svc of services) {
      server.graphql.gateway.serviceMap[svc.name].setSchema(svc.schema)
    }

    const schema = await server.graphql.gateway.refresh()

    if (schema !== null) {
      server.graphql.replaceSchema(schema)
    }
  }, 30000)
}

startServer().catch((err) => {
  console.error(err)
  process.exit(1)
})
