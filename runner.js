// Runnable code blocks and playgrounds for the COSE212 languages.
//
// - Code blocks marked runnable in Markdown (```fae,run) get a run button; the code is editable and
//   the result appears below the block. tools/mark-runnable.py adds the marks.
// - <div class="playground" data-lang="FAE"></div> becomes a small editor with an example program.
// The interpreters (interp.js, Scala.js build of the course implementations) are loaded on first use.
(function () {
  "use strict";

  // code-block language (fence name) -> interpreter name in interp.js
  const LANGS = {
    ae: "AE", vae: "VAE", f1vae: "F1VAE", fvae: "FVAE", fae: "FAE", rfae: "RFAE",
    bfae: "BFAE", mfae: "MFAE", lfae: "LFAE", kfae: "KFAE", "fae-cps": "FAE",
    tfae: "TFAE", trfae: "TRFAE", atfae: "ATFAE", ptfae: "PTFAE", stfae: "STFAE", tifae: "TIFAE",
    minifsharp: "MiniFSharp", minipython: "MiniPython", miniscala: "MiniScala",
  };

  const EXAMPLES = {
    AE: "1 + 2 * 3",
    VAE: "val x = 1;\nval y = 2;\nx + y",
    F1VAE: "def inc(x) = x + 1;\ninc(42)",
    FVAE: "val twice = f => x => f(f(x));\nval inc = x => x + 1;\ntwice(inc)(42)",
    FAE: "(f => x => f(f(x)))(x => x + 1)(42)",
    RFAE: "def fact(n) = if (n > 0) n * fact(n - 1) else 1;\nfact(10)",
    BFAE: "val inc = x => x.set(x.get + 1);\nval b = Box(7);\ninc(b);\ninc(b);\nb.get",
    MFAE: "var x = 7;\nvar add = y => x = x + y;\nadd(3);\nadd(5);\nx",
    LFAE: "val z = 42;\nval x = 1(2);\nz + 1",
    KFAE: "{\n  vcc done;\n  val f = { vcc esc; done(1 + { vcc k; esc(k) }) };\n  f(3)\n}",
    TFAE: "(x: Number) => {\n  val y = x + 1;\n  (z: Number) => z + y * z\n}",
    TRFAE: "def sum(n: Number): Number =\n  def iter(k: Number): Number => Number = (acc: Number) =>\n    if (k > n) acc\n    else iter(k + 1)(acc + k);\n  iter(1)(0);\nsum(100)",
    ATFAE: "enum Tree {\n  case Leaf(Number)\n  case Node(Tree, Number, Tree)\n}\ndef sumTree(t: Tree): Number = t match {\n  case Leaf(x) => x\n  case Node(l, x, r) => sumTree(l) + x + sumTree(r)\n}\nsumTree(Node(Leaf(1), 2, Node(Leaf(3), 4, Leaf(5))))",
    PTFAE: "val f = forall[T] (x: T) => x;\nf[Number => Number](f[Number])(42)",
    STFAE: "val f = (r: {x: Number}) => r.x;\nf({x = 1, y = 2})",
    TIFAE: "def twice(f) = x => f(f(x))\ndef identity(x) = x\ntwice(identity)(42)",
  };

  // the book's programs carry comments (`/* FAE */` headers, `// result` notes) that the
  // course parsers do not accept
  function stripComments(code) {
    return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").trim();
  }

  const ROOT = typeof path_to_root === "string" ? path_to_root : "";
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = ROOT + src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  // mdBook moves to the previous/next chapter on ←/→ (and handles other keys) at the document;
  // keys typed in an editor must stay in the editor
  function keepKeys(host) {
    host.addEventListener("keydown", (e) => e.stopPropagation());
  }

  let editorLoading = null;
  function loadEditor() {
    if (!editorLoading) editorLoading = loadScript("book-editor.js").then(() => window.PLEditor);
    return editorLoading;
  }

  let loading = null;
  function loadInterp() {
    if (!loading) {
      loading = loadScript("interp.js").then(() => new Function("return interp")());
    }
    return loading;
  }

  async function run(name, code, out) {
    out.hidden = false;
    out.classList.remove("error");
    out.textContent = "실행 중...";
    try {
      const interp = await loadInterp();
      const result = String(interp[name](stripComments(code)));
      out.textContent = result;
      if (result.startsWith("[PLError]") || result.startsWith("Unexpected")) out.classList.add("error");
    } catch (e) {
      out.textContent = "인터프리터를 불러오지 못했습니다.";
      out.classList.add("error");
    }
  }

  function runButton(onClick) {
    const b = document.createElement("button");
    b.className = "run-button";
    b.title = "실행";
    b.setAttribute("aria-label", "실행");
    b.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>';
    b.addEventListener("click", onClick);
    return b;
  }

  function setupBlock(code) {
    const lang = [...code.classList].find((c) => c.startsWith("language-"));
    const name = lang && LANGS[lang.slice(9)];
    if (!name) return;
    const pre = code.parentElement;
    const out = document.createElement("pre");
    out.className = "run-output";
    out.hidden = true;
    pre.after(out);
    let getCode = () => code.innerText;
    const btn = runButton(() => run(name, getCode(), out));
    let buttons = pre.querySelector(".buttons");
    if (!buttons) {
      buttons = document.createElement("div");
      buttons.className = "buttons";
      pre.prepend(buttons);
    }
    buttons.prepend(btn);
    // replace the static block by an editor (same grammar and colors as the course website)
    loadEditor().then((PLEditor) => {
      const host = document.createElement("div");
      host.className = "pl-editor";
      keepKeys(host);
      const ed = PLEditor.create(host, name, code.textContent.replace(/\n$/, ""), { onRun: () => btn.click() });
      code.replaceWith(host);
      getCode = ed.getCode;
    }).catch(() => {});
  }

  function setupPlayground(div) {
    const name = div.dataset.lang;
    if (!name) return;
    div.innerHTML = "";
    const head = document.createElement("div");
    head.className = "playground-head";
    const title = document.createElement("span");
    title.textContent = name + " 인터프리터";
    const hint = document.createElement("span");
    hint.className = "playground-hint";
    hint.textContent = "고쳐서 실행해 보세요 (Ctrl/Cmd + Enter)";
    head.append(title, hint);
    const host = document.createElement("div");
    host.className = "pl-editor";
    keepKeys(host);
    const initial = div.dataset.code ? div.dataset.code.replace(/\\n/g, "\n") : (EXAMPLES[name] || "");
    const pre = document.createElement("pre");
    pre.textContent = initial;
    host.append(pre);
    const out = document.createElement("pre");
    out.className = "run-output";
    out.hidden = true;
    let getCode = () => initial;
    const btn = runButton(() => run(name, getCode(), out));
    head.append(btn);
    div.append(head, host, out);
    loadEditor().then((PLEditor) => {
      host.innerHTML = "";
      const ed = PLEditor.create(host, name, initial, { onRun: () => btn.click(), lineNumbers: true });
      getCode = ed.getCode;
    }).catch(() => {});
  }

  function init() {
    document.querySelectorAll("code.run").forEach(setupBlock);
    document.querySelectorAll("div.playground").forEach(setupPlayground);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
