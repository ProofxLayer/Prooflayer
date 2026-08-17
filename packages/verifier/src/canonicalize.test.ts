import { strict as assert } from "node:assert";
import test from "node:test";
import { canonicalize } from "./canonicalize";

test("canonicalize sorts object keys recursively", () => {
  assert.equal(canonicalize({ z: 1, a: { y: true, b: 2 } }), '{"a":{"b":2,"y":true},"z":1}');
});


