# Managed federation with [Apollo Gateway](https://github.com/apollographql/federation)

The difference between federation is that the gateway is no longer responsible to specify the service configurations. The entire composed graph is provided by a single versioned artifact to the gateway.

1. Run `npm run start-registry`
2. Run `npm run start-services`
3. Run `npm run start-gateway`
4. Visit playground `http://localhost:4000/playground`

Try

```graphql
{
  topProducts {
    name
    inStock
    shippingEstimate
    reviews {
      id
      author {
        name
      }
      product {
        name
      }
    }
  }
}
```
