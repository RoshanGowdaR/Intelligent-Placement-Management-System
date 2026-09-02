import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class name utility)", () => {
  it("should merge class names", () => {
    const result = cn("text-sm", "font-bold");
    expect(result).toContain("text-sm");
    expect(result).toContain("font-bold");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toContain("active");
  });

  it("should handle falsy values", () => {
    const result = cn("base", false, null, undefined, "end");
    expect(result).toContain("base");
    expect(result).toContain("end");
  });

  it("should merge Tailwind conflicts correctly", () => {
    const result = cn("px-4", "px-2");
    expect(result).toBe("px-2");
  });

  it("should handle empty input", () => {
    const result = cn();
    expect(result).toBe("");
  });
});
