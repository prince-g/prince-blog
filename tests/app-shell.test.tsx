import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "../src/app/router";

type Attributes = Readonly<Record<string, string>>;

function renderRoute(path: string) {
  const router = createMemoryRouter(appRoutes, { initialEntries: [path] });
  return renderToStaticMarkup(<RouterProvider router={router} />);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function openingTag(tag: string, attributes: Attributes = {}) {
  const requiredAttributes = Object.entries(attributes)
    .map(([name, value]) => `(?=[^>]*\\s${escapeRegExp(name)}="${escapeRegExp(value)}")`)
    .join("");
  return `<${tag}\\b${requiredAttributes}[^>]*>`;
}

function elementContent(markup: string, tag: string, attributes: Attributes = {}) {
  const match = markup.match(new RegExp(`${openingTag(tag, attributes)}([\\s\\S]*?)</${tag}>`));
  if (!match) throw new Error(`Expected <${tag}> with the requested attributes`);
  return match[1];
}

function elementStart(markup: string, tag: string, attributes: Attributes = {}) {
  const match = markup.match(new RegExp(openingTag(tag, attributes)));
  if (match?.index === undefined) throw new Error(`Expected <${tag}> with the requested attributes`);
  return match.index;
}

function expectTextElement(markup: string, tag: string, text: string) {
  expect(markup).toMatch(new RegExp(`${openingTag(tag)}\\s*${escapeRegExp(text)}\\s*</${tag}>`));
}

function expectLink(markup: string, text: string, href: string) {
  expect(markup).toMatch(new RegExp(`${openingTag("a", { href })}\\s*${escapeRegExp(text)}\\s*</a>`));
}

function expectSkipLinkAndMain(markup: string) {
  expectLink(markup, "跳至主要内容", "#main-content");
  elementContent(markup, "main", { id: "main-content" });
}

function expectSiteHeader(markup: string) {
  const header = elementContent(markup, "header");
  expectLink(header, "PRINCE / DIGITAL GARDEN", "/");

  const navigation = elementContent(header, "nav", { "aria-label": "主要导航" });
  expectLink(navigation, "WORK", "/work");
  expectLink(navigation, "NOTES", "/notes");
  expectLink(navigation, "ABOUT", "/about");
}

afterEach(() => vi.unstubAllGlobals());

describe("app shell", () => {
  it("keeps the skip link targeted at the main landmark", () => {
    expectSkipLinkAndMain(renderRoute("/"));
  });

  it("keeps the home stage clean while retaining semantic navigation on secondary pages", () => {
    const home = renderRoute("/");
    expect(home).not.toMatch(/<header\b/);
    expect(home).not.toMatch(/<nav\b/);
    expect(home).not.toContain("PRINCE / DIGITAL GARDEN");
    expect(home).not.toContain("Ideas become interfaces.");
    expect(home).not.toContain("PRESS ANY KEY");
    expect(home).not.toContain("复位键盘视角");
    expectSiteHeader(renderRoute("/work"));
  });

  it("keeps an accessible heading and one keyboard scene with loading-gated text input", () => {
    vi.stubGlobal("document", { createElement: () => ({ getContext: () => ({}) }) });
    const markup = renderRoute("/");
    const main = elementContent(markup, "main", { id: "main-content" });

    expect(elementContent(main, "h1", { class: "sr-only" })).toBe("Keychron K2 HE 交互体验");
    const scene = elementContent(main, "section", { "aria-label": "Keychron K2 HE 交互式三维键盘", "data-experience-phase": "loading" });
    expect(scene).toMatch(new RegExp(openingTag("div", { role: "progressbar", "aria-label": "加载键盘模型", "aria-valuemin": "0", "aria-valuemax": "100" })));
    expect(scene).toMatch(new RegExp(openingTag("textarea", { "aria-label": "键盘输入内容", disabled: "", tabindex: "-1" })));
    expect(elementContent(scene, "div", { class: "typing-viewport", "aria-hidden": "true" })).toContain("keyboard-text-input");
    expect(scene).not.toContain('aria-label="进入磁轴展示"');

    const contentOrder = [
      elementStart(main, "a", { href: "#main-content" }),
      elementStart(main, "h1"),
      elementStart(main, "div", { class: "home-keyboard" }),
      elementStart(main, "div", { role: "progressbar" }),
      elementStart(main, "textarea", { "aria-label": "键盘输入内容" }),
    ];
    expect(contentOrder).toEqual([...contentOrder].sort((first, second) => first - second));
  });

  it.each([
    ["/work", "WORK"],
    ["/notes", "NOTES"],
    ["/about", "ABOUT"],
  ])("keeps the %s placeholder title, status and return-home link", (path, title) => {
    const markup = renderRoute(path);
    const main = elementContent(markup, "main", { id: "main-content" });

    expectSkipLinkAndMain(markup);
    expectSiteHeader(markup);
    expectTextElement(main, "h1", title);
    expectTextElement(main, "p", "内容正在整理");
    expectLink(main, "返回首页", "/");
  });
});
