import { ID_PATTERN } from "../shared/constants";
import { renderHome, renderViewer } from "./paste-view";

const app = document.getElementById("app");

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
