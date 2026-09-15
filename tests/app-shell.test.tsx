import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { appRoutes } from "../src/app/router";

function renderRoute(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

describe("app shell", () => {
  it("renders the home content in its required reading order", () => {
    const markup = renderRoute("/");
    const orderedContent = [
      "跳至主要内容",
      "PRINCE / DIGITAL GARDEN",
      "Ideas become interfaces.",
      "Keychron K2 HE 键盘产品预览",
      "PRESS ANY KEY",
    ];

    expect(orderedContent.every((content) => markup.includes(content))).toBe(true);
    expect(orderedContent.map((content) => markup.indexOf(content))).toEqual(
      [...orderedContent].map((content) => markup.indexOf(content)).sort((a, b) => a - b),
    );
    expect(markup).toContain('href="/work"');
    expect(markup).toContain('href="/notes"');
    expect(markup).toContain('href="/about"');
  });

  it.each(["/work", "/notes", "/about"])(
    "renders the shared header and placeholder at %s",
    (path) => {
      const markup = renderRoute(path);

      expect(markup).toContain("PRINCE / DIGITAL GARDEN");
      expect(markup).toContain("内容正在整理");
      expect(markup).toContain('href="/"');
      expect(markup).toContain("返回首页");
    },
  );
});
