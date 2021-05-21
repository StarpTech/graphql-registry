const { ApolloServer } = require('apollo-server')
const { buildFederatedSchema } = require('@apollo/federation')
const { post } = require('httpie')
const { parse } = require('graphql')

const typeDefs = /* GraphQL */ `
  extend type Query {
    topProducts(first: Int = 5): [Product]
  }
  type Product @key(fields: "upc") {
    upc: String!
    name: String
    price: Int
    weight: Int
  }
`

async function main() {
  // Push schema to registry
  await post(`http://localhost:3000/schema/push`, {
    body: {
      typeDefs: typeDefs,
      graphName: 'my_graph',
      serviceName: 'products',
      routingUrl: 'http://localhost:4003/graphql',
    },
  })
  startServer()
}

function startServer() {
  const resolvers = {
    Product: {
      __resolveReference(object) {
        return products.find((product) => product.upc === object.upc)
      },
    },
    Query: {
      topProducts(_, args) {
        return products.slice(0, args.first)
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

  server.listen({ port: 4003 }).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`)
  })

  const products = [
    {
      upc: '1',
      name: 'Table',
      price: 899,
      weight: 100,
    },
    {
      upc: '2',
      name: 'Couch',
      price: 1299,
      weight: 1000,
    },
    {
      upc: '3',
      name: 'Chair',
      price: 54,
      weight: 50,
    },
  ]
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
