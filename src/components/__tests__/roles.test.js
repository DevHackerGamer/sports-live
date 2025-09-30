import { getUserRoles, isAdminFromUser } from "../../lib/roles";

describe("roles utilities", () => {
  describe("getUserRoles", () => {
    it("returns [] if user is null/undefined", () => {
      expect(getUserRoles(null)).toEqual([]);
      expect(getUserRoles(undefined)).toEqual([]);
    });

    it("collects roles from private and public metadata", () => {
      const user = {
        privateMetadata: { type: "Admin", roles: ["manager"] },
        publicMetadata: { type: "user", roles: ["editor"] },
      };
      expect(getUserRoles(user)).toEqual(
        expect.arrayContaining(["admin", "manager", "user", "editor"])
      );
    });

    it("handles missing roles gracefully", () => {
      const user = { privateMetadata: {}, publicMetadata: {} };
      expect(getUserRoles(user)).toEqual([]);
    });

    it("deduplicates roles and makes them lowercase", () => {
      const user = {
        privateMetadata: { roles: ["Admin", "Admin"] },
        publicMetadata: { type: "ADMIN" },
      };
      expect(getUserRoles(user)).toEqual(["admin"]);
    });
  });

  describe("isAdminFromUser", () => {
    it("returns true if 'admin' role exists", () => {
      const user = { privateMetadata: { roles: ["admin"] } };
      expect(isAdminFromUser(user)).toBe(true);
    });

    it("returns false if no 'admin' role", () => {
      const user = { privateMetadata: { roles: ["editor"] } };
      expect(isAdminFromUser(user)).toBe(false);
    });
  });
});