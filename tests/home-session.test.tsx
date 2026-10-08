import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "../src/app/router";
import { hasEnteredPersonalHome, rememberPersonalHome } from "../src/pages/home/entrance-session";

afterEach(() => vi.unstubAllGlobals());

function renderHome() {
  return renderToStaticMarkup(<RouterProvider router={createMemoryRouter(appRoutes, { initialEntries: ["/"] })} />);
}

describe("completed entrance session", () => {
  it("returns straight to the personal page after a document navigation or refresh", () => {
    vi.stubGlobal("window", { sessionStorage: { getItem: (key: string) => key === "prince-blog:entered" ? "1" : null } });
    const markup = renderHome();
    expect(markup).toContain('data-home-stage="personal"');
    expect(markup).not.toContain('class="home-keyboard"');
    expect(markup).toContain('data-portrait-active="true"');
    expect(markup).not.toContain("重新体验键盘");
  });

  it("starts a fresh tab at the keyboard", () => {
    vi.stubGlobal("window", { sessionStorage: { getItem: () => null } });
    expect(renderHome()).toContain('data-home-stage="keyboard"');
  });

  it("still renders when the browser denies session storage access", () => {
    vi.stubGlobal("window", Object.defineProperty({}, "sessionStorage", { get() { throw new Error("Storage denied"); } }));
    expect(renderHome()).toContain('data-home-stage="keyboard"');
    rememberPersonalHome();
    expect(hasEnteredPersonalHome()).toBe(true);
    expect(renderHome()).toContain('data-home-stage="personal"');
  });

  it("persists the completed handoff for the next document, without marking a partial entrance", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    vi.stubGlobal("window", { sessionStorage: storage });
    expect(renderHome()).toContain('data-home-stage="keyboard"');
    expect(values.size).toBe(0);
    rememberPersonalHome();
    vi.stubGlobal("window", { sessionStorage: storage });
    expect(renderHome()).toContain('data-home-stage="personal"');
  });
});
