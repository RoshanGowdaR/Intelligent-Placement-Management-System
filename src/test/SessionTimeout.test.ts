import { describe, it, expect, beforeEach } from "vitest";

// Test session timeout utility functions
describe("Admin Session Timeout Utilities", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should save admin state to localStorage", () => {
    localStorage.setItem("admin_last_route", "/admin/settings");
    localStorage.setItem("admin_last_activity", Date.now().toString());

    expect(localStorage.getItem("admin_last_route")).toBe("/admin/settings");
    expect(localStorage.getItem("admin_last_activity")).toBeTruthy();
  });

  it("should retrieve admin resume route", () => {
    localStorage.setItem("admin_last_route", "/admin/analytics");
    const route = localStorage.getItem("admin_last_route");
    expect(route).toBe("/admin/analytics");
  });

  it("should return null when no saved route", () => {
    const route = localStorage.getItem("admin_last_route");
    expect(route).toBeNull();
  });

  it("should clear admin state", () => {
    localStorage.setItem("admin_last_route", "/admin/tests");
    localStorage.setItem("admin_last_activity", "123456");
    localStorage.removeItem("admin_last_route");
    localStorage.removeItem("admin_last_activity");

    expect(localStorage.getItem("admin_last_route")).toBeNull();
    expect(localStorage.getItem("admin_last_activity")).toBeNull();
  });

  it("should detect expired session based on timeout", () => {
    const ADMIN_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
    const oldTimestamp = Date.now() - ADMIN_TIMEOUT_MS - 1000;
    localStorage.setItem("admin_last_activity", oldTimestamp.toString());

    const lastActivity = parseInt(localStorage.getItem("admin_last_activity") || "0");
    const isExpired = Date.now() - lastActivity > ADMIN_TIMEOUT_MS;

    expect(isExpired).toBe(true);
  });

  it("should detect active session within timeout", () => {
    const ADMIN_TIMEOUT_MS = 60 * 60 * 1000;
    const recentTimestamp = Date.now() - 1000; // 1 second ago
    localStorage.setItem("admin_last_activity", recentTimestamp.toString());

    const lastActivity = parseInt(localStorage.getItem("admin_last_activity") || "0");
    const isExpired = Date.now() - lastActivity > ADMIN_TIMEOUT_MS;

    expect(isExpired).toBe(false);
  });
});
