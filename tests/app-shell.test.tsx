import { renderToStaticMarkup } from "react-dom/server";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
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

describe("app shell", () => {
  it("keeps the skip link targeted at the main landmark", () => {
    expectSkipLinkAndMain(renderRoute("/"));
  });

  it("keeps the shared header navigation semantic and correctly linked", () => {
    expectSiteHeader(renderRoute("/"));
  });

  it("keeps the home heading, keyboard hero and key prompt as ordered main content", () => {
    const markup = renderRoute("/");
    const main = elementContent(markup, "main", { id: "main-content" });

    expectTextElement(main, "h1", "Ideas become interfaces.");
    expect(main).toMatch(new RegExp(
      `${openingTag("div", { class: "home-keyboard" })}\\s*${openingTag("div", { role: "status", "aria-live": "polite" })}`,
    ));
    expectTextElement(main, "p", "PRESS ANY KEY");

    const contentOrder = [
      elementStart(main, "a", { href: "#main-content" }),
      elementStart(main, "header"),
      elementStart(main, "h1"),
      elementStart(main, "div", { class: "home-keyboard" }),
      elementStart(main, "p", { class: "key-prompt" }),
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
