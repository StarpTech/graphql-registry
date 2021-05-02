<div align="center">
  <img src="logo.png" alt="graphql-registry" width="400" />
</div>

<br>

<div align="center">
  <a href="https://github.com/StarpTech/graphql-registry/actions?query=workflow%3ACI">
    <img src="https://github.com/StarpTech/graphql-registry/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://github.com/StarpTech/graphql-registry/actions?query=workflow%3ABENCH">
    <img src="https://github.com/StarpTech/graphql-registry/actions/workflows/bench.yml/badge.svg" alt="BENCH" />
  </a>
</div>

<div align="center">GraphQL registry</div>

<br/>

> There should be a **single source of truth** for registering and tracking the graph.

## Features

State: Experimental

- Create multiple graph (for example, staging and production, or different development branches)
- Stores versioned schemas for all GraphQL-federated services
- Serves schema for GraphQL gateway based on provided services & their versions
- Validates new schema to be compatible with other running services
- Produce a diff between your proposed schema and the current registry state
- Lightweight authorization concept with JWT.

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

PUT - `/schema/deactivate` Deactivates a schema by id. The schema will no longer be part of any result. You can re-activate it by registering.

<details>
<summary>Example Request</summary>
<p>

```jsonc
{
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

## Authentication & Authorization

### Basic Auth

You have to set `BASIC_AUTH=secret1,secret2` to enbale basic auth. The secret is used as user and pass combination.

### JWT Bearer Token

You have to set `JWT_SECRET=secret` to enable jwt. The jwt payload must match the following schema:

```jsonc
{
  "services": ["foo"] // names of the granted services
}
```

This activates authorization in the `/schema/push` endpoint. Only the client with the valid jwt is be able to register schemas in the name of the services. You can use [jwt.io](https://jwt.io/) to construct a jwt.

### Development

```
docker-compose up postgres
# Create db schema
npx prisma db push --preview-feature
npm run dev
npm run test
```

### Benchmark

Run a benchmark with:

```
docker-compose up postgres
docker-compose up --build app
docker-compose run k6 run /benchmark/composed-schema.js
```

Our benchmark suite is running in the CI.
