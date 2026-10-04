import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasPermission, permissionsForRole } from "./authorization";

describe("authorization", () => {
  it("allows an admin to publish and roll back imported data", () => {
    assert.equal(hasPermission("admin", "data:write"), true);
    assert.equal(hasPermission("admin", "data:rollback"), true);
  });

  it("keeps a viewer read-only", () => {
    assert.equal(hasPermission("viewer", "dashboard:read"), true);
    assert.equal(hasPermission("viewer", "data:write"), false);
    assert.equal(hasPermission("viewer", "comments:write"), false);
  });

  it("returns an immutable permission set for every supported role", () => {
    const permissions = permissionsForRole("executive");
    assert.equal(permissions.includes("assistant:use"), true);
    assert.equal(permissions.includes("data:write"), false);
    assert.equal(Object.isFrozen(permissions), true);
  });
});
