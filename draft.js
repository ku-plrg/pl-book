// Marks chapters that have not been reviewed yet as drafts (a banner at the top of the page).
// After reviewing a chapter, add its file name (without .md) to REVIEWED.
(function () {
  "use strict";
  const REVIEWED = [
  ];
  let page = location.pathname.split("/").pop().replace(/\.html$/, "") || "index";
  if (page === "index") page = "introduction";  // mdBook copies the first chapter to index.html
  if (page === "print" || page === "404" || REVIEWED.includes(page)) return;
  const ko = document.documentElement.lang === "ko";
  const box = document.createElement("div");
  box.className = "draft-banner";
  box.innerHTML = ko
    ? "<b>초안</b> 이 장은 아직 검수 중인 초안입니다. 틀린 곳이 있을 수 있습니다."
    : "<b>Draft</b> This chapter is a draft under review and may contain errors.";
  const main = document.querySelector("main");
  if (main) main.prepend(box);
})();
