# Federation with [Apollo Gateway](https://github.com/apollographql/federation)

1. Run `npm run start-registry`
2. Run `npm run start-services`
3. Run `npm run start-gateway`
4. Visit playground `http://localhost:3002/playground`

Try

```graphql
{
  topProducts {
    upc
  }
}
```
