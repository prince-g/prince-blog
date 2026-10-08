import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProbeLoader } from "./ProbeLoader";

describe("probe loader entry", () => {
  it("keeps an accessible zero readout and keyboard-operable power button before activation", () => {
    const markup = renderToStaticMarkup(<ProbeLoader progress={99} ready onComplete={() => {}} />);
    expect(markup).toMatch(/role="progressbar"[^>]*aria-label="加载键盘模型"[^>]*aria-valuemin="0"[^>]*aria-valuemax="100"[^>]*aria-valuenow="0"/);
    expect(markup).toMatch(/<button[^>]*type="button"/);
    expect(markup).toContain("POWER ON");
  });
});
