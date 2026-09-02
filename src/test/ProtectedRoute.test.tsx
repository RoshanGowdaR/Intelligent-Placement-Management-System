import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Mock useAuth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/hooks/useAuth";
const mockUseAuth = vi.mocked(useAuth);

describe("ProtectedRoute", () => {
  it("shows loading spinner when loading", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      loading: true,
      session: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("redirects to login when no user", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      role: null,
      loading: false,
      session: null,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders children when user is authenticated with correct role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "test-user" } as any,
      role: "student",
      loading: false,
      session: {} as any,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="student"><div>Protected Content</div></ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("redirects when user has wrong role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "test-user" } as any,
      role: "student",
      loading: false,
      session: {} as any,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });

    render(
      <MemoryRouter>
        <ProtectedRoute requiredRole="admin"><div>Admin Content</div></ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });
});
