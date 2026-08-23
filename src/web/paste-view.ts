// 홈 폼과 paste 뷰어의 렌더링 로직.
// XSS 방어의 핵심 규칙: 이 파일 어디에서도 innerHTML을 쓰지 않는다.
// 사용자 입력은 항상 createTextNode/textContent 경로로만 DOM에 들어간다.
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import ini from "highlight.js/lib/languages/ini";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import php from "highlight.js/lib/languages/php";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import ruby from "highlight.js/lib/languages/ruby";
import rust from "highlight.js/lib/languages/rust";
import shell from "highlight.js/lib/languages/shell";
import sql from "highlight.js/lib/languages/sql";
import swift from "highlight.js/lib/languages/swift";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";
import "highlight.js/styles/github-dark.css";

import { EXPIRATIONS, ID_PATTERN, LANGUAGES } from "../shared/constants";
import * as api from "./api";
import {
  accessProof,
  base64UrlEncode,
  decrypt,
  encrypt,
  generateKey,
  keyFromFragment,
} from "./crypto";

// --- highlight.js 등록 (whitelist에 있는 언어만 번들에 포함) ---
const HLJS_LANGS: Record<string, string> = {
  plaintext: "plaintext",
  text: "plaintext",
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  go: "go",
  rust: "rust",
  c: "c",
  cpp: "cpp",
  csharp: "csharp",
  php: "php",
  ruby: "ruby",
  swift: "swift",
  kotlin: "kotlin",
  sql: "sql",
  json: "json",
  yaml: "yaml",
  bash: "bash",
  shell: "shell",
  html: "xml",
  xml: "xml",
  css: "css",
  markdown: "markdown",
  diff: "diff",
  dockerfile: "dockerfile",
  ini: "ini",
  toml: "ini",
};
for (const name of new Set(Object.values(HLJS_LANGS))) {
  const mod: Record<string, unknown> = {
    plaintext,
    javascript,
    typescript,
    python,
    java,
    go,
    rust,
    c,
    cpp,
    csharp,
    php,
    ruby,
    swift,
    kotlin,
    sql,
    json,
    yaml,
    bash,
    shell,
    xml,
    css,
    markdown,
    diff,
    dockerfile,
    ini,
  };
  const def = mod[name];
  if (def) hljs.registerLanguage(name, def as Parameters<typeof hljs.registerLanguage>[1]);
}

/** 사용자 제공 언어 값을 화이트리스트로 정규화한다 */
function normalizeLanguage(lang: string | null | undefined): string | null {
  if (!lang) return null;
  const l = lang.toLowerCase().trim();
  return Object.hasOwn(HLJS_LANGS, l) ? (HLJS_LANGS[l] ?? null) : null;
}

interface TurnstileApi {
  render(el: HTMLElement, opts: { sitekey: string }): string;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

// --- 작은 유틸 ---
type Attrs = Record<string, string>;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of children) {
    node.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

function formatExpiry(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString();
}

function clear(container: HTMLElement): void {
  container.replaceChildren();
}

function toast(message: string): void {
  const region = document.getElementById("toast-region");
  if (!region) return;
  const item = el("div", { class: "toast", role: "status", text: message });
  region.append(item);
  window.setTimeout(() => item.remove(), 5000);
}

function codeBlock(payload: string, language: string | null): HTMLElement {
  const normalized = normalizeLanguage(language);
  const wrapper = el("div", { class: "code-wrap" });
  const pre = el("pre", {});
  const code = el("code", {});
  // 사용자 입력은 textContent로만 주입 — HTML로 실행될 수 없다
  code.textContent = payload;
  if (normalized && normalized !== "plaintext") {
    code.className = `language-${normalized}`;
  }
  pre.append(code);
  wrapper.append(pre);
  try {
    hljs.highlightElement(code);
  } catch {
    // 하이라이트 실패는 표시 자체를 막지 않는다
  }
  return wrapper;
}

// --- Turnstile ---
async function loadTurnstile(container: HTMLElement): Promise<(() => string | undefined) | null> {
  let siteKey: string | null = null;
  const config = await api.getConfig();
  if (config.ok) siteKey = config.data.turnstileSiteKey;
  if (!siteKey) return null;

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("turnstile load failed"));
    document.head.append(script);
  });
  if (!window.turnstile) return null;

  const widgetId = window.turnstile.render(container, { sitekey: siteKey });
  container.dataset.widget = widgetId;
  return () => {
    const input = container.querySelector<HTMLInputElement>("input[name]");
    return input?.value || undefined;
  };
}

// --- 홈 폼 ---
export function renderHome(container: HTMLElement): void {
  clear(container);

  const heading = el("h1", { text: "New secure paste" });
  const payloadArea = el("textarea", {
    id: "payload",
    rows: "14",
    placeholder: "Paste your code, log, or text here…",
    spellcheck: "false",
  });
  const payloadLabel = el("label", { for: "payload", text: "Content" });

  const expiryFieldset = el("fieldset");
  expiryFieldset.append(el("legend", { text: "Expiration" }));
  for (const key of Object.keys(EXPIRATIONS)) {
    const radio = el("input", { type: "radio", name: "expiry", value: key, id: `exp-${key}` });
    if (key === "1d") radio.checked = true;
    expiryFieldset.append(
      el("span", { class: "option" }, radio, el("label", { for: `exp-${key}`, text: key })),
    );
  }

  const secretBox = el("input", { type: "checkbox", id: "secret" });
  const burnBox = el("input", { type: "checkbox", id: "burn" });

  const langSelect = el("select", { id: "language" });
  for (const lang of LANGUAGES) {
    langSelect.append(el("option", { value: lang, text: lang }));
  }
  langSelect.value = "auto";

  const turnstileBox = el("div", { id: "turnstile-box", class: "turnstile-box" });
  const errorLine = el("p", { class: "form-error", role: "alert" });
  const submitBtn = el("button", { type: "submit", class: "primary", text: "Create secure paste" });

  const form = el("form", { class: "paste-form" });
  form.append(
    payloadLabel,
    payloadArea,
    expiryFieldset,
    el(
      "div",
      { class: "toggles" },
      el(
        "span",
        { class: "option" },
        secretBox,
        el("label", { for: "secret", text: "Secret encryption" }),
      ),
      el(
        "span",
        { class: "option" },
        burnBox,
        el("label", { for: "burn", text: "Burn after reading" }),
      ),
    ),
    el(
      "div",
      { class: "lang-row" },
      el("label", { for: "language", text: "Language" }),
      langSelect,
    ),
    turnstileBox,
    errorLine,
    submitBtn,
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorLine.textContent = "";
    const payload = payloadArea.value;
    if (!payload.trim()) {
      errorLine.textContent = "내용을 입력하세요.";
      return;
    }

    const expiresIn =
      form.querySelector<HTMLInputElement>("input[name='expiry']:checked")?.value ?? "1d";
    const encrypted = secretBox.checked;
    const burnAfterRead = burnBox.checked;

    // 서버와 동일한 UTF-8 byte 기준 사전 검사 (413 방지 UX)
    const limit = encrypted ? 320 * 1024 : 256 * 1024;
    let body = payload;
    if (byteLength(body) > limit) {
      errorLine.textContent = `내용이 너무 큽니다 (최대 ${Math.floor(limit / 1024)} KiB).`;
      return;
    }

    let accessProofHash: string | undefined;
    let fragment = "";
    if (encrypted) {
      const key = generateKey();
      body = await encrypt(key, payload);
      accessProofHash = await accessProof(key);
      fragment = `#k=${base64UrlEncode(key)}`;
      if (byteLength(body) > limit) {
        errorLine.textContent = "암호화 후 크기가 한도를 초과합니다.";
        return;
      }
    }

    submitBtn.disabled = true;
    const result = await api.createPaste({
      payload: body,
      expiresIn,
      encrypted,
      burnAfterRead,
      language: langSelect.value,
      accessProof: accessProofHash,
      encryptionVersion: encrypted ? 1 : undefined,
      turnstileToken: getTurnstileToken?.(),
    });
    submitBtn.disabled = false;

    if (!result.ok) {
      errorLine.textContent =
        result.status === 429
          ? "요청이 너무 많습니다. 잠시 후 다시 시도하세요."
          : `생성 실패: ${result.message}`;
      return;
    }
    showCreateResult(container, result.data, fragment, encrypted);
  });

  const intro = el("p", {
    class: "intro",
    text: "Ephemeral · Private · Disposable — 개발자용 보안 텍스트 공유",
  });
  container.append(intro, heading, form);

  // Turnstile은 폼 렌더 직후 비동기 준비
  void loadTurnstile(turnstileBox).then((getToken) => {
    getTurnstileToken = getToken ?? undefined;
  });
}

let getTurnstileToken: (() => string | undefined) | undefined;

function showCreateResult(
  container: HTMLElement,
  data: { id: string; expiresAt: number; encrypted: boolean; burnAfterRead: boolean },
  fragment: string,
  encrypted: boolean,
): void {
  clear(container);
  const url = `${window.location.origin}/p/${data.id}${fragment}`;
  const urlInput = el("input", { type: "text", readonly: "", value: url, class: "result-url" });
  urlInput.setAttribute("aria-label", "Generated paste URL");

  const copyBtn = el("button", { type: "button", text: "Copy link" });
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("링크가 복사되었습니다.");
    } catch {
      urlInput.select();
      toast("자동 복사 실패 — URL을 선택해 직접 복사하세요.");
    }
  });

  const panel = el("div", { class: "panel result-panel" });
  panel.append(
    el("h1", { text: "Paste created" }),
    el(
      "dl",
      { class: "meta-list" },
      el("dt", { text: "Expires at" }),
      el("dd", { text: formatExpiry(data.expiresAt) }),
      el("dt", { text: "Encrypted" }),
      el("dd", { text: data.encrypted ? "Yes" : "No" }),
      el("dt", { text: "Burn after reading" }),
      el("dd", { text: data.burnAfterRead ? "Yes" : "No" }),
    ),
    urlInput,
    el(
      "div",
      { class: "btn-row" },
      copyBtn,
      el("a", { href: url, class: "button-link primary", text: "Open" }),
    ),
  );
  if (encrypted) {
    panel.append(
      el("p", {
        class: "warn",
        text: "이 URL에는 복호화 키(#k=…)이 포함되어 있습니다. 이 URL을 잃어버리면 내용을 복구할 수 없습니다.",
      }),
    );
  }
  container.append(panel);
}

// --- 뷰어 ---
export function renderViewer(container: HTMLElement, id: string): void {
  if (!ID_PATTERN.test(id)) {
    renderNotFound(container);
    return;
  }
  clear(container);
  void (async () => {
    const meta = await api.getMeta(id);
    if (!meta.ok) {
      renderNotFound(container);
      return;
    }
    const key = keyFromFragment(window.location.hash);

    if (meta.data.burnAfterRead) {
      renderBurnConfirm(container, id, meta.data, key);
      return;
    }
    if (meta.data.encrypted) {
      renderEncryptedView(container, id, key);
      return;
    }
    const content = await api.getContent(id);
    if (!content.ok) {
      renderNotFound(container);
      return;
    }
    renderContentView(
      container,
      content.data.language,
      content.data.payload,
      false,
      true,
      content.data.expiresAt,
    );
  })();
}

function renderBurnConfirm(
  container: HTMLElement,
  id: string,
  meta: { encrypted: boolean; expiresAt: number },
  key: Uint8Array | null,
): void {
  if (meta.encrypted && !key) {
    renderMissingKey(container);
    return;
  }
  const revealBtn = el("button", {
    type: "button",
    class: "danger primary",
    text: "Reveal and destroy",
  });
  const panel = el(
    "div",
    { class: "panel center" },
    el("h1", { text: "One-time paste" }),
    el("p", {
      class: "warn",
      text: "This paste can only be viewed once. Opening it will permanently delete it.",
    }),
    el("p", { text: `Expires at ${formatExpiry(meta.expiresAt)}` }),
    revealBtn,
  );
  revealBtn.addEventListener("click", () => {
    revealBtn.disabled = true;
    void (async () => {
      const proof = key ? await accessProof(key) : undefined;
      const result = await api.consume(id, proof);
      if (!result.ok) {
        renderNotFound(container);
        return;
      }
      let payload = result.data.payload;
      if (result.data.encrypted && key) {
        try {
          payload = await decrypt(key, payload);
        } catch {
          renderWrongKey(container);
          return;
        }
      }
      renderContentView(
        container,
        result.data.language,
        payload,
        true,
        false,
        result.data.expiresAt,
      );
    })();
  });
  container.append(panel);
}

function renderEncryptedView(container: HTMLElement, id: string, key: Uint8Array | null): void {
  if (!key) {
    renderMissingKey(container);
    return;
  }
  void (async () => {
    const proof = await accessProof(key);
    const result = await api.getContent(id, proof);
    if (!result.ok) {
      renderNotFound(container);
      return;
    }
    try {
      const plain = await decrypt(key, result.data.payload);
      renderContentView(container, result.data.language, plain, false, true, result.data.expiresAt);
    } catch {
      renderWrongKey(container);
    }
  })();
  container.append(el("p", { class: "loading", text: "Decrypting…" }));
}

function renderMissingKey(container: HTMLElement): void {
  clear(container);
  container.append(
    el(
      "div",
      { class: "panel center" },
      el("h1", { text: "Encryption key is missing." }),
      el("p", {
        text: "URL fragment(#k=…)에 복호화 키가 없습니다. 키는 서버에 저장되지 않으므로 복구할 수 없습니다.",
      }),
    ),
  );
}

function renderWrongKey(container: HTMLElement): void {
  clear(container);
  container.append(
    el(
      "div",
      { class: "panel center" },
      el("h1", { text: "Unable to decrypt this paste." }),
      el("p", { text: "키가 올바르지 않거나 데이터가 손상되었습니다." }),
    ),
  );
}

export function renderNotFound(container: HTMLElement): void {
  clear(container);
  container.append(
    el(
      "div",
      { class: "panel center" },
      el("h1", { text: "Paste not found" }),
      el("p", { text: "존재하지 않거나 만료되었거나 이미 소모된 paste입니다." }),
      el("a", { href: "/", class: "button-link primary", text: "Create a new paste" }),
    ),
  );
}

function renderContentView(
  container: HTMLElement,
  language: string | null,
  payload: string,
  destroyed: boolean,
  allowRaw: boolean,
  expiresAt: number,
): void {
  clear(container);
  const panel = el(
    "div",
    { class: "panel" },
    el(
      "div",
      { class: "view-head" },
      el("span", { class: "chip", text: `Language: ${language ?? "auto"}` }),
      el("span", { class: "chip", text: `Expires: ${formatExpiry(expiresAt)}` }),
    ),
  );
  if (destroyed) {
    panel.append(
      el("p", {
        class: "destroyed-banner",
        role: "status",
        text: "This content has now been destroyed.",
      }),
    );
  }
  panel.append(codeBlock(payload, language));
  if (allowRaw && !destroyed) {
    const rawUrl = `${window.location.pathname.replace(/^\/p\//, "/raw/")}`;
    panel.append(el("a", { href: rawUrl, class: "raw-link", text: "Raw" }));
  }
  container.append(panel);
}
