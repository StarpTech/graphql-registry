# API

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
  "service_name": "foo"
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
  "service_name": "foo"
}
```

</p>
</details>

## Monitoring / Maintanance

### Remove all schemas except the most (N) recent

POST - `/schema/garbage_collect` Removes all schemas except the most recent N of every service. Returns the count removed schemas and versions. This could be called by a cron.

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