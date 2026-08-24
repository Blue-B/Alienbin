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
import { t, tf } from "./i18n";
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
  // v1의 줄번호 복원. aria-hidden으로 스크린리더 중복 읽기 방지
  const lineNumbers = el("div", { class: "line-numbers", "aria-hidden": "true" });
  const lineCount = payload.split("\n").length;
  for (let i = 1; i <= lineCount; i++) {
    lineNumbers.append(el("span", { text: String(i) }));
  }
  const pre = el("pre", {});
  const code = el("code", {});
  // 사용자 입력은 textContent로만 주입 — HTML로 실행될 수 없다
  code.textContent = payload;
  if (normalized && normalized !== "plaintext") {
    code.className = `language-${normalized}`;
  }
  pre.append(code);
  wrapper.append(lineNumbers, pre);
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
function dataPoint(index: string, title: string, desc: string): HTMLElement {
  return el(
    "article",
    { class: "data-item" },
    el("span", { class: "data-index", text: index }),
    el("div", {}, el("h3", { text: title }), el("p", { text: desc })),
  );
}

/** 상태 화면(소각 확인·404·복호화 실패)에 등장하는 작은 마스코트 */
function stateMascot(dim = false): HTMLImageElement {
  return el("img", {
    class: dim ? "mascot mascot-dim" : "mascot",
    src: "/logo.png",
    alt: "",
    width: "84",
    height: "84",
  });
}

export function renderHome(container: HTMLElement): void {
  clear(container);

  const payloadArea = el("textarea", {
    id: "payload",
    rows: "14",
    placeholder: t("placeholder"),
    spellcheck: "false",
  });
  const payloadLabel = el("label", { for: "payload", text: t("content") });

  // v1의 TAB 들여쓰기 복원
  payloadArea.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    payloadArea.setRangeText("  ", payloadArea.selectionStart, payloadArea.selectionEnd, "end");
  });

  const expiryFieldset = el("fieldset");
  expiryFieldset.append(el("legend", { text: t("expiration") }));
  for (const key of Object.keys(EXPIRATIONS)) {
    const radio = el("input", { type: "radio", name: "expiry", value: key, id: `exp-${key}` });
    if (key === "1d") radio.checked = true;
    expiryFieldset.append(
      el(
        "span",
        { class: "option exp-pill" },
        radio,
        el("label", { for: `exp-${key}`, text: key }),
      ),
    );
  }

  const secretBox = el("input", { type: "checkbox", id: "secret" });
  // 열람 제한: 무제한(기본) 또는 N회. 1회 = 열면 즉시 삭제(기존의 소각)
  let readLimit: number | null = null;
  const limitHint = el("p", { class: "field-hint limit-hint" });
  limitHint.hidden = true;
  const segmentGroup = el("span", { class: "segment-group", role: "group" });
  segmentGroup.setAttribute("aria-label", t("readLimit"));
  for (const n of [null, 1, 3, 5, 10]) {
    const seg = el("button", {
      type: "button",
      class: "segment",
      text: n === null ? t("limitUnlimited") : tf("reads", n),
    });
    if (n === null) seg.classList.add("active");
    seg.addEventListener("click", () => {
      readLimit = n;
      for (const b of segmentGroup.querySelectorAll("button")) b.classList.remove("active");
      seg.classList.add("active");
      if (n === null) {
        limitHint.hidden = true;
      } else {
        limitHint.textContent = n === 1 ? t("limitOnceHint") : tf("limitMultiHint", n);
        limitHint.hidden = false;
      }
    });
    segmentGroup.append(seg);
  }
  const limitRow = el("div", { class: "limit-row" });
  limitRow.append(el("span", { class: "limit-label", text: t("readLimit") }), segmentGroup);

  // 시크릿 토글 설명: 켜면 무엇이 일어나는지(패스워드가 없는 이유 포함) 즉시 보여준다
  const secretHint = el("p", { class: "field-hint", text: t("secretExplainer") });
  secretHint.hidden = true;
  secretBox.addEventListener("change", () => {
    secretHint.hidden = !secretBox.checked;
  });

  const langSelect = el("select", { id: "language" });
  for (const lang of LANGUAGES) {
    langSelect.append(el("option", { value: lang, text: lang }));
  }
  langSelect.value = "auto";

  const turnstileBox = el("div", { id: "turnstile-box", class: "turnstile-box" });
  const errorLine = el("p", { class: "form-error", role: "alert" });
  const submitBtn = el("button", { type: "submit", class: "primary", text: t("create") });

  const form = el("form", { class: "paste-workbench" });
  const securityFieldset = el("fieldset", { class: "security" });
  securityFieldset.append(el("legend", { text: t("securityLegend") }));
  securityFieldset.append(
    el("span", { class: "option" }, secretBox, el("label", { for: "secret", text: t("secret") })),
    secretHint,
    limitRow,
    limitHint,
  );

  const editorHead = el(
    "div",
    { class: "editor-head" },
    el(
      "div",
      { class: "editor-title" },
      payloadLabel,
      el("span", { class: "editor-format", text: "UTF-8 / TEXT" }),
    ),
    el("span", { class: "editor-status", text: "READY" }),
  );
  const editorPanel = el("section", { class: "editor-panel" }, editorHead, payloadArea);
  const settingsRail = el(
    "aside",
    { class: "settings-rail" },
    el(
      "div",
      { class: "rail-head" },
      el("span", { text: "TRANSMISSION CONTROL" }),
      el("span", { text: "01" }),
    ),
    expiryFieldset,
    securityFieldset,
    el(
      "div",
      { class: "lang-row" },
      el("label", { for: "language", text: t("language") }),
      langSelect,
    ),
    turnstileBox,
    errorLine,
    submitBtn,
  );
  form.append(editorPanel, settingsRail);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorLine.textContent = "";
    const payload = payloadArea.value;
    if (!payload.trim()) {
      errorLine.textContent = t("errEmpty");
      return;
    }

    const expiresIn =
      form.querySelector<HTMLInputElement>("input[name='expiry']:checked")?.value ?? "1d";
    const encrypted = secretBox.checked;
    const burnAfterRead = readLimit !== null;

    // 서버와 동일한 UTF-8 byte 기준 사전 검사 (413 방지 UX)
    const limit = encrypted ? 320 * 1024 : 256 * 1024;
    let body = payload;
    if (byteLength(body) > limit) {
      errorLine.textContent = tf("errTooLarge", Math.floor(limit / 1024));
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
        errorLine.textContent = t("errEncryptTooLarge");
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
      maxReads: readLimit ?? undefined,
      turnstileToken: getTurnstileToken?.(),
    });
    submitBtn.disabled = false;

    if (!result.ok) {
      errorLine.textContent =
        result.status === 429 ? t("errRateLimited") : `${t("errCreateFailed")}${result.message}`;
      return;
    }
    showCreateResult(container, result.data, fragment, encrypted);
  });

  const intro = el("p", { class: "intro", text: t("tagline") });
  const mascot = el("img", {
    class: "hero-alien",
    src: "/alien-mascot-v2.png",
    alt: "코드 조각을 들고 떠 있는 Alienbin 외계인 마스코트",
    width: "320",
    height: "480",
  });
  const signalLabel = el(
    "span",
    { class: "signal-label" },
    el("span", { class: "signal-dot", "aria-hidden": "true" }),
    "ALIENBIN // OPEN CHANNEL",
  );
  const heroCopy = el(
    "div",
    { class: "hero-copy" },
    signalLabel,
    el("h1", { text: t("heroTitle") }),
    intro,
    el(
      "div",
      { class: "hero-facts" },
      el("span", { text: "NO ACCOUNT" }),
      el("span", { text: "AES-GCM" }),
      el("span", { text: "AUTO EXPIRE" }),
    ),
  );
  const mascotWrap = el(
    "div",
    { class: "hero-visual" },
    mascot,
    el("span", { class: "orbit-label", text: "TRANSMISSION READY" }),
  );
  const hero = el("section", { class: "hero-shell" }, heroCopy, mascotWrap);

  const dataStrip = el(
    "section",
    { class: "data-strip", "aria-label": "Alienbin features" },
    dataPoint("01", t("feat1Title"), t("feat1Desc")),
    dataPoint("02", t("feat2Title"), t("feat2Desc")),
    dataPoint("03", t("feat3Title"), t("feat3Desc")),
  );
  container.append(hero, form, dataStrip);

  // Turnstile은 폼 렌더 직후 비동기 준비
  void loadTurnstile(turnstileBox).then((getToken) => {
    getTurnstileToken = getToken ?? undefined;
  });
}

let getTurnstileToken: (() => string | undefined) | undefined;

function showCreateResult(
  container: HTMLElement,
  data: {
    id: string;
    expiresAt: number;
    encrypted: boolean;
    burnAfterRead: boolean;
    maxReads?: number;
  },
  fragment: string,
  encrypted: boolean,
): void {
  clear(container);
  const url = `${window.location.origin}/p/${data.id}${fragment}`;
  const urlInput = el("input", { type: "text", readonly: "", value: url, class: "result-url" });
  urlInput.setAttribute("aria-label", "Generated paste URL");

  const copyBtn = el("button", { type: "button", text: t("copyLink") });
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast(t("copied"));
      // 버튼 자체의 즉시 피드백
      copyBtn.textContent = t("copied");
      copyBtn.classList.add("success");
      setTimeout(() => {
        copyBtn.textContent = t("copyLink");
        copyBtn.classList.remove("success");
      }, 1600);
    } catch {
      urlInput.select();
      toast(t("copyFallback"));
    }
  });

  const panel = el("div", { class: "panel result-panel" });
  panel.append(
    el("h1", { text: t("resultTitle") }),
    el(
      "dl",
      { class: "meta-list" },
      el("dt", { text: t("expiresAt") }),
      el("dd", { text: formatExpiry(data.expiresAt) }),
      el("dt", { text: t("encrypted") }),
      el("dd", { text: data.encrypted ? t("yes") : t("no") }),
      el("dt", { text: t("resultLimit") }),
      el("dd", {
        text: data.burnAfterRead ? tf("reads", data.maxReads ?? 1) : t("limitUnlimited"),
      }),
    ),
    urlInput,
    el(
      "div",
      { class: "btn-row" },
      copyBtn,
      el(
        "a",
        { href: url, class: "button-link primary open-link" },
        el("span", { text: t("open") }),
        el("span", { class: "chip-icon", text: "↗" }),
      ),
    ),
  );
  if (encrypted) {
    panel.append(
      el("p", {
        class: "warn",
        text: t("keyWarning"),
      }),
    );
  }
  container.append(panel);
}

// --- 소개 (v1 /about 복원) ---
export function renderAbout(container: HTMLElement): void {
  clear(container);
  const panel = el("div", { class: "panel about" });
  panel.append(
    stateMascot(),
    el("h1", { text: t("aboutTitle") }),
    el("p", { text: t("aboutIntro") }),
    el("h2", { text: t("aboutFeaturesTitle") }),
    el(
      "ul",
      { class: "about-list" },
      el("li", { text: t("featAnon") }),
      el("li", { text: t("featCode") }),
      el("li", { text: t("featPrivate") }),
    ),
    el("h2", { text: t("freeTitle") }),
    el("p", { text: t("freeDesc") }),
    el("h2", { text: t("privacyTitle") }),
    el("p", { text: t("privacyDesc") }),
    el("h2", { text: t("contactTitle") }),
    el("p", { text: t("contactDesc") }),
    el(
      "div",
      { class: "btn-row" },
      el("a", {
        href: "https://github.com/Blue-B/Alienbin",
        target: "_blank",
        rel: "noreferrer",
        class: "button-link",
        text: "GitHub",
      }),
    ),
  );
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
  meta: { encrypted: boolean; expiresAt: number; maxReads?: number; remainingReads?: number },
  key: Uint8Array | null,
): void {
  if (meta.encrypted && !key) {
    renderMissingKey(container);
    return;
  }
  const max = meta.maxReads ?? 1;
  const remaining = meta.remainingReads ?? max;
  const multi = max > 1;
  const revealBtn = el("button", {
    type: "button",
    class: "danger primary",
    text: multi ? t("open") : t("reveal"),
  });
  const panel = el(
    "div",
    { class: "panel center" },
    stateMascot(),
    el("h1", { text: (meta.maxReads ?? 1) > 1 ? t("limitTitle") : t("oneTimeTitle") }),
    el("p", {
      class: "warn",
      text: multi ? tf("multiDesc", remaining) : t("oneTimeDesc"),
    }),
    el("p", { text: `${t("expiresAt")}: ${formatExpiry(meta.expiresAt)}` }),
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
        result.data.remainingReads === 0,
        false,
        result.data.expiresAt,
        result.data.remainingReads,
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
  container.append(el("p", { class: "loading", text: t("decrypting") }));
}

function renderMissingKey(container: HTMLElement): void {
  clear(container);
  container.append(
    el(
      "div",
      { class: "panel center" },
      stateMascot(true),
      el("h1", { text: t("missingKeyTitle") }),
      el("p", {
        text: t("missingKeyDesc"),
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
      stateMascot(true),
      el("h1", { text: t("wrongKeyTitle") }),
      el("p", { text: t("wrongKeyDesc") }),
    ),
  );
}

export function renderNotFound(container: HTMLElement): void {
  clear(container);
  container.append(
    el(
      "div",
      { class: "panel center" },
      stateMascot(true),
      el("h1", { text: t("notFoundTitle") }),
      el("p", { text: t("notFoundDesc") }),
      el("a", { href: "/", class: "button-link primary", text: t("notFoundCreate") }),
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
  remainingReads?: number,
): void {
  clear(container);
  const panel = el(
    "div",
    { class: "panel" },
    el(
      "div",
      { class: "view-head" },
      el("span", { class: "chip", text: `${t("chipLanguage")}: ${language ?? "auto"}` }),
      el("span", { class: "chip", text: `${t("chipExpires")}: ${formatExpiry(expiresAt)}` }),
    ),
  );
  if (destroyed) {
    panel.append(
      el("p", {
        class: "destroyed-banner",
        role: "status",
        text: t("destroyed"),
      }),
    );
  } else if (remainingReads != null && remainingReads > 0) {
    // N회용 burn: 아직 남은 횟수를 보여준다
    panel.append(
      el("span", {
        class: "chip reads-left",
        role: "status",
        text: tf("readsLeft", remainingReads),
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
