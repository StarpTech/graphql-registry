<div align="center">
  <img src="logo.png" alt="graphql-registry" width="350" />
</div>

<br>

<div align="center">
  <a href="https://github.com/StarpTech/graphql-registry/actions?query=workflow%3ACI">
    <img src="https://github.com/StarpTech/graphql-registry/workflows/CI/badge.svg?event=push" alt="CI" />
  </a>
</div>

<div align="center">Serverless GraphQL registry build with <a href="https://developers.cloudflare.com/workers/learning/how-workers-works">Cloudflare Worker</a> &amp; <a href="https://developers.cloudflare.com/workers/learning/how-kv-works">KV Storage</a></div>

### Features

- Stores and validates versioned schemas of different GraphQL Services
- Service discovery of all registered GraphQL Services
- Tooling to diff / validate your schema
- Everywhere fast, secure and accessible due to [Cloudflare infrastructure](https://developers.cloudflare.com/workers/learning/how-workers-works)
- Global distributed, low-latency store for [persisted queries](https://www.apollographql.com/docs/apollo-server/performance/apq/)

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

```json
{
  "key": "apq:foo",
  "query": "query"
}
```

</p>
</details>

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

For debugger support check out the master branch of [`worktop`](https://github.com/lukeed/worktop) and reference it as local dependency `file:../worktop` in the package.json. Additionally, replace `./bin/register` with `ts-node/register` in the package.json. The fix hasn't been released yet.

### Credits

- https://github.com/lukeed/worktop - We use it as web framework.
- https://github.com/pipedrive/graphql-schema-registry - Served as great inspiration of a schema registry in Node.js
- <div>Icons made by <a href="" title="Kiranshastry">Kiranshastry</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
