/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`src/routes/register-schema.test.ts TAP Register new schema Should not be possible to push invalid schema > Empty 1`] = `
Object {
  "data": Array [],
  "success": true,
}
`

exports[`src/routes/register-schema.test.ts TAP Register new schema Should not create multiple schemas when type_defs does not change > Client schemas after second push same data 1`] = `
Object {
  "data": Array [
    Object {
      "created_at": 1618948427027,
      "is_active": true,
      "service_id": "foo",
      "type_defs": "type Query { hello: String }",
      "uid": "916348424",
      "updated_at": 1618948427027,
      "version": "1",
    },
  ],
  "success": true,
}
`

exports[`src/routes/register-schema.test.ts TAP Register new schema Should not create multiple schemas when type_defs does not change > First schema and client 1`] = `
Object {
  "data": Array [
    Object {
      "created_at": 1618948427027,
      "is_active": true,
      "service_id": "foo",
      "type_defs": "type Query { hello: String }",
      "uid": "916348424",
      "updated_at": null,
      "version": "1",
    },
  ],
  "success": true,
}
`

exports[`src/routes/register-schema.test.ts TAP Register new schema Should register new schema > Client schemas after first push 1`] = `
Object {
  "data": Array [
    Object {
      "created_at": 1618948427027,
      "is_active": true,
      "service_id": "foo",
      "type_defs": "type Query { hello: String }",
      "uid": "916348424",
      "updated_at": null,
      "version": "1",
    },
  ],
  "success": true,
}
`

exports[`src/routes/register-schema.test.ts TAP Register new schema Should register schemas from multiple clients > schemas from two different clients 1`] = `
Object {
  "data": Array [
    Object {
      "created_at": 1618948427027,
      "is_active": true,
      "service_id": "foo",
      "type_defs": "type Query { hello: String }",
      "uid": "916348424",
      "updated_at": null,
      "version": "1",
    },
    Object {
      "created_at": 1618948427027,
      "is_active": true,
      "service_id": "bar",
      "type_defs": "type Query2 { hello: String }",
      "uid": "1323442088",
      "updated_at": null,
      "version": "2",
    },
  ],
  "success": true,
}
`
