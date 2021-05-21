const { ApolloServer } = require('apollo-server')
const { ApolloGateway } = require('@apollo/gateway')
const { get } = require('httpie')
const { parse } = require('graphql')
const { composeAndValidate } = require('@apollo/federation')

// TODO: registry should return supgergraph sdl
async function fetchServices() {
  const res = await get(`http://localhost:3000/schema/latest?graphName=my_graph`)

  return res.data.data.map((svc) => {
    return {
      name: svc.serviceName,
      url: svc.routingUrl,
      typeDefs: parse(svc.typeDefs),
    }
  })
}

async function startServer() {
  const gateway = new ApolloGateway({
    // fetch for schema or service updates every 30s
    experimental_pollInterval: 30000,

    async experimental_updateSupergraphSdl() {
      const services = await fetchServices()
      const { supergraphSdl } = composeAndValidate(services)
      return {
        // TODO: registry should return compositionId
        id: services.map((s) => s.version).join('-'), // supergraph only updates when id changes
        supergraphSdl,
      }
    },

    // Experimental: Enabling this enables the query plan view in Playground.
    __exposeQueryPlanExperimental: false,
  })

  const server = new ApolloServer({
    gateway,

    // Apollo Graph Manager (previously known as Apollo Engine)
    // When enabled and an `ENGINE_API_KEY` is set in the environment,
    // provides metrics, schema management and trace reporting.
    engine: false,

    // Subscriptions are unsupported but planned for a future Gateway version.
    subscriptions: false,
  })

  server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`)
  })
}

startServer().catch((err) => {
  console.error(err)
  process.exit(1)
})
