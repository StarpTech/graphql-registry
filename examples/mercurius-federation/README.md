# Federation with [Mercurius](https://github.com/mercurius-js/mercurius)

Federation allows you to split your unified schema in multiple pieces, managed by separate services. This has benefits for scaling and maintainability.

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
