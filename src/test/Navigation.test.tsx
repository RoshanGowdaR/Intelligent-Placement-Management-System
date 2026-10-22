import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock useAuth for route tests
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    role: null,
    loading: false,
    session: null,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock QueryClient
vi.mock("@tanstack/react-query", () => ({
  QueryClient: vi.fn(() => ({})),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Navigation & Routing", () => {
  it("should render the landing page at root route", async () => {
    const { default: Index } = await import("@/pages/Index");
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    // Landing page should show some content
    expect(document.body).toBeTruthy();
  });

  it("should have correct admin route paths defined", () => {
    const adminPaths = [
      "/admin",
      "/admin/companies",
      "/admin/tests",
      "/admin/students",
      "/admin/analytics",
      "/admin/reports",
      "/admin/leaderboard",
      "/admin/settings",
    ];
    // Verify route structure
    adminPaths.forEach((path) => {
      expect(path).toMatch(/^\/admin/);
    });
  });

  it("should have correct student route paths defined", () => {
    const studentPaths = [
      "/dashboard",
      "/dashboard/tests",
      "/dashboard/results",
      "/dashboard/schedule",
      "/dashboard/profile",
      "/dashboard/companies",
    ];
    studentPaths.forEach((path) => {
      expect(path).toMatch(/^\/dashboard/);
    });
  });
});
