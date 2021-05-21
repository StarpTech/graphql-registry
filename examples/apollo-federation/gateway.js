const { ApolloServer } = require('apollo-server')
const { ApolloGateway } = require('@apollo/gateway')
const { post } = require('httpie')
const { parse } = require('graphql')

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
      typeDefs: parse(svc.typeDefs),
    }
  })
}

async function startServer() {
  const gateway = new ApolloGateway({
    // fetch for schema updates every 30s
    experimental_pollInterval: 30000,

    async experimental_updateServiceDefinitions() {
      return {
        isNewSchema: true,
        serviceDefinitions: await fetchServices(),
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
