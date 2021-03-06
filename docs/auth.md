# Authentication & Authorization

## Basic Auth

You have to set `BASIC_AUTH=secret1,secret2` to enbale basic auth. The secret is used as user and pass combination.

## JWT Bearer Token

You have to set `JWT_SECRET=secret` to enable jwt. The jwt payload must match the following schema:

```jsonc
{
  "client": "my-service", // your unique client name
  "services": [] // additional services you have control over.
```

This activates authorization in the `/schema/push` endpoint. Only the client with a valid jwt is be able to register schemas in the name of the `services`. The client will have access to all available graphs. You can use [jwt.io](https://jwt.io/) to construct a valid jwt.
