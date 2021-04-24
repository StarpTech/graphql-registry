<div align="center">
  <img src="logo.png" alt="graphql-registry" width="400" />
</div>

<br>

<div align="center">
  <a href="https://github.com/StarpTech/graphql-registry/actions?query=workflow%3ACI">
    <img src="https://github.com/StarpTech/graphql-registry/workflows/CI/badge.svg?event=push" alt="CI" />
  </a>
</div>

<div align="center">Serverless GraphQL registry build with <a href="https://developers.cloudflare.com/workers/learning/how-workers-works">Cloudflare Worker</a> &amp; <a href="https://developers.cloudflare.com/workers/learning/how-kv-works">KV Storage</a></div>

### Features

- Stores versioned schemas for GraphQL-federated services
- Serves schema for GraphQL gateway based on provided services & their versions
- Validates new schema to be compatible with other running services
- Everywhere fast, secure and accessible due to [Cloudflare infrastructure](https://developers.cloudflare.com/workers/learning/how-workers-works)
- Global distributed, low-latency store for [persisted queries](https://www.apollographql.com/docs/apollo-server/performance/apq/) with TTL (timestamp and duration).

### Use cases

- Management of a federated data graph
  - Source of truth for what is running in your infrastrucutre.
  - Register schema updates to see it its compatible with the current schema.
  - Pull the latest schema in your gateway without restarting your servers.
  - Deploy multiple instances of the registry to cover graph variants (staging, production).
- Enable Persisted Queries with [TTL](https://www.apollographql.com/docs/apollo-server/performance/apq/#adjusting-cache-time-to-live-ttl) support.
- :sunglasses: Build your own Apollo Studio.

### Schema federation

GET - `/schema/latest` Returns the last registered schema definition of all services.

POST - `/schema/push` Validates and registers new schema for a service.

<details>
<summary>Example Request</summary>
<p>

```json
{
  "type_defs": "type Query { hello: String }",
  "version": "1",
  "name": "foo"
}
```

</p>
</details>

POST - `/schema/compose` Returns the last registered schema definition of all services based on passed services & their versions.

<details>
<summary>Example Request</summary>
<p>

```json
{
  "services": [{ "name": "foo", "version": "1" }]
}
```

</p>
</details>

PUT - `/schema/deactivate` Deactivates a schema by id. The schema will no longer be part of any result. You can re-activate it by register again.

<details>
<summary>Example Request</summary>
<p>

```json
{
  "schemaId": "916348424"
}
```

</p>
</details>

### Validation

POST - `/schema/diff` Returns the schema report of all services and the provided new schema.

<details>
<summary>Example Request</summary>
<p>

```json
{
  "type_defs": "type Query { hello: String }",
  "name": "foo"
}
```

</p>
</details>

POST - `/schema/validate` Validate schema between provided and latest schemas.

<details>
<summary>Example Request</summary>
<p>

```json
{
  "type_defs": "type Query { hello: String }",
  "name": "foo"
}
```

</p>
</details>

### Persisted Queries

GET - `/persisted_query?key=foo` Looks up persisted query from KV Storage.

POST - `/persisted_query` Adds persisted query to the KV Storage.

<details>
<summary>Example Request</summary>
<p>

```jsonc
{
  "key": "apq:foo",
  "query": "query",
  "expiration": 1619269775623, // specific date as unix-timestamp
  "ttl": 600 // 5min
}
```

</p>
</details>

DELETE - `/persisted_query` Deletes persisted query from KV Storage.

<details>
<summary>Example Request</summary>
<p>

```json
{
  "key": "apq:foo"
}
```

</p>
</details>

### Monitoring

GET - `/health` healthcheck endpoint.

### Authentication

Clients authenticate via [`Basic-Auth`](https://en.wikipedia.org/wiki/Basic_access_authentication). You have to set the cloudflare secret `ALLOWED_CLIENT_SECRETS=secret1,secret2`. The secret is used as user and pass combination.

```sh
wrangler secret put ALLOWED_CLIENT_SECRETS
```

### Performance & Security

All data is stored in the Key-value Store of cloudflare. Cloudflare KV is eventually-consistent and was designed for high-read low-latency use-cases. All data is encrypted at rest with 256-bit AES-GCM.

Check [How KV works](https://developers.cloudflare.com/workers/learning/how-kv-works) to learn more about it.

### Development & Deployment

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/StarpTech/graphql-registry)

```sh
npm run dev
```

#### Detailed logs

```sh
wrangler tail
```

### Credits

- https://github.com/lukeed/worktop - We use it as web framework.
- https://github.com/pipedrive/graphql-schema-registry - Served as great inspiration of a schema registry in Node.js
- <div>Icons made by <a href="" title="Kiranshastry">Kiranshastry</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
