import { ID_PATTERN } from "../shared/constants";
import "@fontsource-variable/space-grotesk";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import { initLang, mountLangToggle, t } from "./i18n";
import { type InfoPage, renderInfoPage } from "./info-view";
import { renderHome, renderViewer } from "./paste-view";

// 언어 결정(localStorage > 브라우저 설정)을 가장 먼저 확정한다.
initLang();

const app = document.getElementById("app");
const toggleGroup = document.getElementById("lang-toggle");
const path = window.location.pathname;

if (toggleGroup) {
  mountLangToggle(toggleGroup);
  const navNew = document.getElementById("nav-new");
  if (navNew) navNew.textContent = t("navNew");
  const navAbout = document.getElementById("nav-about");
  if (navAbout) navAbout.textContent = t("navAbout");
  const navPrivacy = document.getElementById("nav-privacy");
  if (navPrivacy) navPrivacy.textContent = t("navPrivacy");
  const skipContent = document.getElementById("skip-content");
  if (skipContent) skipContent.textContent = t("skipContent");

  const currentNav =
    path === "/" ? navNew : path === "/about" ? navAbout : path === "/privacy" ? navPrivacy : null;
  currentNav?.setAttribute("aria-current", "page");
}

if (app) {
  const pasteMatch = /^\/p\/([A-Za-z0-9_-]{22})$/.exec(path);
  const infoMatch = /^\/(about|privacy|terms|security)$/.exec(path);
  if (pasteMatch?.[1] && ID_PATTERN.test(pasteMatch[1])) {
    renderViewer(app, pasteMatch[1]);
  } else if (infoMatch?.[1]) {
    renderInfoPage(app, infoMatch[1] as InfoPage);
  } else {
    // "/"와 그 외 알 수 없는 경로는 홈 폼으로 처리한다
    renderHome(app);
  }
}
