const { ApolloServer } = require('apollo-server')
const { buildFederatedSchema } = require('@apollo/federation')
const { post } = require('httpie')
const { parse } = require('graphql')

const typeDefs = /* GraphQL */ `
  extend type Query {
    me: User
  }
  type User @key(fields: "id") {
    id: ID!
    name: String
    username: String
  }
`

async function main() {
  // Push schema to registry
  await post(`http://localhost:3000/schema/push`, {
    body: {
      typeDefs: typeDefs,
      graphName: 'my_graph',
      serviceName: 'accounts',
      routingUrl: 'http://localhost:4001/graphql',
    },
  })
  startServer()
}

function startServer() {
  const resolvers = {
    Query: {
      me() {
        return users[0]
      },
    },
    User: {
      __resolveReference(object) {
        return users.find((user) => user.id === object.id)
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

  server.listen({ port: 4001 }).then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`)
  })

  const users = [
    {
      id: '1',
      name: 'Ada Lovelace',
      birthDate: '1815-12-10',
      username: '@ada',
    },
    {
      id: '2',
      name: 'Alan Turing',
      birthDate: '1912-06-23',
      username: '@complete',
    },
  ]
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
