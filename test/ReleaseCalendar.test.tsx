import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../src/App";
import { calendarFixture } from "./fixtures/calendar";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-05T12:00:00Z"));
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: string) =>
        new Response(
          JSON.stringify(
            calendarFixture(
              new URL(input, "http://localhost").searchParams.get("month")!,
            ),
          ),
        ),
    ),
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
function mount() {
  return render(
    <MemoryRouter initialEntries={["/releases"]}>
      <App />
    </MemoryRouter>,
  );
}

describe("release calendar", () => {
  it("shows dated films, filters case-insensitively and preserves the filter across tabs", async () => {
    mount();
    await screen.findByRole("heading", { name: "Nebula" });
    const input = screen.getByRole("searchbox", {
      name: "Filter titles for this month",
    });
    fireEvent.change(input, { target: { value: "nEbUlA" } });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("link", { name: "Friends" }));
    fireEvent.click(screen.getByRole("link", { name: "Releases" }));
    expect(input).toHaveValue("nEbUlA");
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Clear title filter" }));
    expect(screen.getAllByRole("article")).toHaveLength(25);
  });
  it("navigates months, presents a revival and falls back if a poster fails", async () => {
    mount();
    await screen.findByRole("heading", { name: "Nebula" });
    expect(
      screen.getByRole("button", { name: "Previous month" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    await screen.findByRole("heading", { name: "The Devils" });
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeVisible();
    expect(screen.getByText(/Theatrical revival/)).toBeVisible();
    const img = document.querySelector(".poster img")!;
    fireEvent.error(img);
    expect(screen.getByText("Poster unavailable")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Watch list" }));
    fireEvent.click(screen.getByRole("link", { name: "Releases" }));
    expect(screen.getByRole("heading", { name: "October 2026" })).toBeVisible();
  });
  it("separates no matching titles from a successfully loaded empty month", async () => {
    mount();
    await screen.findByRole("heading", { name: "Nebula" });
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "not a film" },
    });
    expect(screen.getByText("No titles match your search.")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Show all films" }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    await screen.findByRole("heading", { name: "The Devils" });
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    await screen.findByText("No releases listed for this month.");
  });
  it("renders an error and retries instead of claiming there are no releases", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("{}", { status: 503 }));
    mount();
    await screen.findByRole("alert");
    expect(
      screen.queryByText("No releases listed for this month."),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByRole("heading", { name: "Nebula" });
  });
  it("explains an unrefreshed month and includes visible TMDB credit", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...calendarFixture(),
          films: [],
          monthSynced: false,
          lastSuccessfulSync: null,
        }),
      ),
    );
    mount();
    await screen.findByText(/Release dates for this month have not been updated yet/);
    expect(
      screen.getByText("Release dates have not been loaded yet."),
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: "About and credits" }),
    ).toHaveTextContent("This product uses the TMDB API");
  });
  it("does not repeat the initial date jump when the title filter changes", async () => {
    mount();
    await screen.findByRole("heading", { name: "Nebula" });
    await waitFor(() =>
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1),
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "Nebula" },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
