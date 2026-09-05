import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { App } from "../src/App";

describe("application navigation", () => {
  it("opens releases by default and exposes all three destinations", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Make time",
    );
    expect(screen.getByRole("link", { name: "Releases" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Starred" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Friends" })).toBeVisible();
  });
  it("navigates to friends and moves focus to the new content", () => {
    render(
      <MemoryRouter initialEntries={["/releases"]}>
        <App />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("link", { name: "Friends" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Bring your people.",
    );
    expect(screen.getByRole("main")).toHaveFocus();
  });
  it("opens a direct starred link and provides a route back", () => {
    render(
      <MemoryRouter initialEntries={["/starred"]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Worth the wait.",
    );
    expect(
      screen.getByRole("link", { name: /Back to releases/ }),
    ).toHaveAttribute("href", "/releases");
  });
});
