import { ID_PATTERN } from "../shared/constants";
import { initLang, mountLangToggle, t } from "./i18n";
import { renderHome, renderViewer } from "./paste-view";

// 언어 결정(localStorage > 브라우저 설정)을 가장 먼저 확정한다.
initLang();

const app = document.getElementById("app");
const toggleGroup = document.getElementById("lang-toggle");

if (toggleGroup) {
  mountLangToggle(toggleGroup);
  const navNew = document.getElementById("nav-new");
  if (navNew) navNew.textContent = t("navNew");
}

if (app) {
  const path = window.location.pathname;
  const pasteMatch = /^\/p\/([A-Za-z0-9_-]{22})$/.exec(path);
  if (pasteMatch?.[1] && ID_PATTERN.test(pasteMatch[1])) {
    renderViewer(app, pasteMatch[1]);
  } else {
    // "/"와 그 외 알 수 없는 경로는 홈 폼으로 처리한다
    renderHome(app);
  }
}
