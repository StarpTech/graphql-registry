<div align="center">
  <img src="logo.png" alt="graphql-registry" width="400" />
</div>

<br>

<div align="center">
  <a href="https://github.com/StarpTech/graphql-registry/actions?query=workflow%3ACI">
    <img src="https://github.com/StarpTech/graphql-registry/workflows/CI/badge.svg?event=push" alt="CI" />
  </a>
</div>

<div align="center">GraphQL registry build with <a href="https://developers.cloudflare.com/workers/learning/how-workers-works">Cloudflare Worker</a> &amp; <a href="https://developers.cloudflare.com/workers/learning/how-kv-works">KV Storage</a></div>

<br/>

> There should be a **single source of truth** for registering and tracking the graph.

## Features

State: Experimental

- Create multiple versions of the graph (for example, staging and production, or different development branches)
- Stores versioned schemas for all GraphQL-federated services
- Serves schema for GraphQL gateway based on provided services & their versions
- Validates new schema to be compatible with other running services
- Everywhere fast, secure and accessible due to [Cloudflare infrastructure](https://developers.cloudflare.com/workers/learning/how-workers-works)
- Global distributed, low-latency store for [persisted queries](https://www.apollographql.com/docs/apollo-server/performance/apq/) with [TTL](https://www.apollographql.com/docs/apollo-server/performance/apq/#adjusting-cache-time-to-live-ttl) (timestamp and duration).

[**Read more**](https://principledgraphql.com/integrity#3-track-the-schema-in-a-registry)

## Schema federation

### Get all Graphs

GET - `/graphs` Returns all registered graphs.

### Get latest schemas

GET - `/schema/latest?graph_name=my_graph` Returns the last registered schema definition of all services.

### Register a schema

POST - `/schema/push` Creates a new graph and schema for a service.

<details>
<summary>Example Request</summary>
<p>

```jsonc
{
  "type_defs": "type Query { hello: String }",
  "version": "1",
  "graph_name": "my_graph",
  "service_name": "foo"
}
```

</p>
</details>

### Get latest schemas by versions

POST - `/schema/compose` Returns the last registered schema definition of all services based on passed services & their versions.

<details>
<summary>Example Request</summary>
<p>

```jsonc
{
  "graph_name": "my_graph",
  "services": [{ "name": "foo", "version": "1" }] // if versions can't be found it fails
}
```

</p>
</details>

### Deactivate a schema

PUT - `/schema/deactivate` Deactivates a schema by id. The schema will no longer be part of any result. You can re-activate it by register again.

<details>
<summary>Example Request</summary>
<p>

```jsonc
{
  "graph_name": "my_graph",
  "service_name": "foo",
  "schemaId": "916348424"
}
```

</p>
</details>

## Validation

### Produce a diff from your schema

POST - `/schema/diff` Returns the schema report of all services and the provided new schema.

<details>
<summary>Example Request</summary>
<p>

```json
{
  "graph_name": "my_graph",
  "type_defs": "type Query { hello: String }",
  "name": "foo"
}
```

</p>
</details>

### Validate your schema

POST - `/schema/validate` Validate schema between provided and latest schemas.

<details>
<summary>Example Request</summary>
<p>

```json
{
  "graph_name": "my_graph",
  "type_defs": "type Query { hello: String }",
  "name": "foo"
}
```

</p>
</details>

## Persisted Queries

### Get persisted query

GET - `/persisted_query?key=foo` Looks up persisted query from KV Storage.

### Add new persisted query

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

### Delete persisted query

DELETE - `/persisted_query` Deletes persisted query from KV Storage.

<details>
<summary>Example Request</summary>
<p>

```jsonc
{
  "key": "foo"
}
```

</p>
</details>

## Monitoring / Maintanance

### Remove all schemas except the most (N) recent

POST - `/schema/garbage_collect` Removes all schemas except the most recent N of every service. Returns the removed schemas. This could be called by a [trigger](https://developers.cloudflare.com/workers/platform/cron-triggers).

<details>
<summary>Example Request</summary>
<p>

```jsonc
{
  "num_schemas_keep": 10 // minimum is 10
}
```

</p>
</details>

### Check if registry is reachable

GET - `/health` healthcheck endpoint.

## Authentication

Clients authenticate via [`Basic-Auth`](https://en.wikipedia.org/wiki/Basic_access_authentication). You have to set the cloudflare secret `ALLOWED_CLIENT_SECRETS=secret1,secret2`. The secret is used as user and pass combination.

```sh
wrangler secret put ALLOWED_CLIENT_SECRETS
```

## Performance & Security

All data is stored in the Key-value Store of cloudflare. Cloudflare KV is eventually-consistent and was designed for high-read low-latency use-cases. All data is encrypted at rest with 256-bit AES-GCM.

Check [How KV works](https://developers.cloudflare.com/workers/learning/how-kv-works) to learn more about it.

## Development & Deployment

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/StarpTech/graphql-registry)

```sh
npm run dev
```

## Other considerations

Due to the nature of Cloudlfare KV storage reads are eventual consistent. Writes are immediately visible to other requests in the same edge location, but can take up to 60 seconds to be visible in other parts of the world. This means that writes can overwrite each other which is not ideal. In theory, when one service of the same graph write schemas in parallel to the registry, one schema might get lost in transit. In practice, there is one graph per environment and only one publisher (for example the CI/CD pipeline). The Graph integrity is maintained all the time. In the long term, I will consider to optimize the registry for Node.js in combination with a transactional database.

### Benchmark

Run a benchmark with:

```
docker run -e SECRET=<basic_auth_secret> -e URL=<worker_url> -i loadimpact/k6 run - < benchmark/composed-schema.js
```

### Detailed logs

```sh
wrangler tail
```

## Credits

- https://github.com/lukeed/worktop - We use it as web framework.
- https://github.com/pipedrive/graphql-schema-registry - Served as great inspiration of a schema registry in Node.js
