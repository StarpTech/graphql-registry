const { ApolloServer } = require('apollo-server')
const { buildFederatedSchema } = require('@apollo/federation')
const { post } = require('httpie')
const { parse } = require('graphql')

const typeDefs = /* GraphQL */ `
  extend type Product @key(fields: "upc") {
    upc: String! @external
    weight: Int @external
    price: Int @external
    inStock: Boolean
    shippingEstimate: Int @requires(fields: "price weight")
  }
`

async function main() {
  // Push schema to registry
  await post(`http://localhost:3000/schema/push`, {
    body: {
      typeDefs: typeDefs,
      graphName: 'my_graph',
      serviceName: 'inventory',
      routingUrl: 'http://localhost:4004/graphql',
    },
  })
  startServer()
}

function startServer() {
  const resolvers = {
    Product: {
      __resolveReference(object) {
        return {
          ...object,
          ...inventory.find((product) => product.upc === object.upc),
        }
      },
      shippingEstimate(object) {
        // free for expensive items
        if (object.price > 1000) return 0
        // estimate is based on weight
        return object.weight * 0.5
      },
    },
  }

  const server = new ApolloServer({
    schema: buildFederatedSchema([
      {
        typeDefs: parse(typeDefs),
        resolvers,
      },
    ]),
  })

  server.listen({ port: 4004 }).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`)
  })

  const inventory = [
    { upc: '1', inStock: true },
    { upc: '2', inStock: false },
    { upc: '3', inStock: true },
  ]
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
