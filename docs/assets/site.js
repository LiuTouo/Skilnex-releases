function initMotion() {
  const root = document.documentElement;
  root.classList.add("js");
  if (!("IntersectionObserver" in window)) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const wide = matchMedia("(min-width: 1024px) and (min-height: 760px)");
  const story = document.querySelector(".feature-story");
  const steps = [...story.querySelectorAll("[data-scene]")];
  const panels = [...story.querySelectorAll("[data-panel]")];
  const reveals = [
    ...document.querySelectorAll(
      ".section-heading, .feature, .secondary-features > p, .download-options > article, .quick-start > li, .closing-inner > *",
    ),
  ];
  let revealObserver;
  let sceneObserver;

  for (const element of reveals) {
    const peers = reveals.filter(
      (other) => other.parentElement === element.parentElement,
    );
    element.classList.add("reveal", `d${Math.min(peers.indexOf(element), 5)}`);
  }

  function showScene(name) {
    story.dataset.activeScene = name;
    for (const panel of panels) {
      panel.classList.toggle("is-active", panel.dataset.panel === name);
    }
  }

  function refreshMotion() {
    revealObserver?.disconnect();
    sceneObserver?.disconnect();
    root.classList.remove("motion-ready", "story-enabled");
    if (reduced.matches) return;

    // Motion is optional: a failed observer must never hide the site or break the demo.
    try {
      revealObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("in-view");
            revealObserver.unobserve(entry.target);
          }
        },
        { threshold: 0.08 },
      );
      for (const element of reveals) {
        if (!element.classList.contains("in-view"))
          revealObserver.observe(element);
      }
      root.classList.add("motion-ready");

      if (wide.matches) {
        const visible = new Map();
        sceneObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting)
                visible.set(entry.target, entry.intersectionRatio);
              else visible.delete(entry.target);
            }
            const active = [...visible].sort((a, b) => b[1] - a[1])[0];
            if (active) showScene(active[0].dataset.scene);
          },
          {
            rootMargin: "-35% 0px -35% 0px",
            threshold: [0, 0.25, 0.5, 0.75, 1],
          },
        );
        showScene(story.dataset.activeScene);
        root.classList.add("story-enabled");
        for (const step of steps) sceneObserver.observe(step);
      }
    } catch {
      revealObserver?.disconnect();
      sceneObserver?.disconnect();
      root.classList.remove("motion-ready", "story-enabled");
    }
  }

  root.addEventListener("focusin", (event) => {
    const element = event.target.closest(".reveal");
    if (!element) return;
    element.classList.add("in-view");
    revealObserver?.unobserve(element);
  });
  reduced.addEventListener("change", refreshMotion);
  wide.addEventListener("change", refreshMotion);
  refreshMotion();
}

const english = document.documentElement.lang === "en";
const copy = english
  ? {
      choose: "Choose at least one target to preview.",
      selected:
        "Targets changed. Preview the differences again before continuing.",
      initial: "Codex is selected. See what will be copied first.",
      ready: "Review the files for each target, then confirm the sync.",
      conflict:
        "Pi has local edits. Review the differences and approve replacement to continue.",
      done: "Demo sync complete. No real files were changed.",
      missing: "New copy",
      outdated: "Source updated",
      modified: "Local edits",
      added: "Add file",
      changed: "Change file",
      confirm:
        "I reviewed Pi's local edits and approve replacing this demo copy.",
      synced: "— example content now matches",
    }
  : {
      choose: "請至少選擇一個目標，才能預覽變更。",
      selected: "目標已變更，請重新預覽差異再繼續。",
      initial: "已選擇 Codex。先看看將複製的內容。",
      ready: "先看完每個目標的檔案差異，再確認同步。",
      conflict: "Pi 有自己的修改。請檢查差異，並確認同意取代才能繼續。",
      done: "示範同步完成。未操作任何真實檔案。",
      missing: "建立新副本",
      outdated: "來源已更新",
      modified: "目標有修改",
      added: "新增檔案",
      changed: "變更檔案",
      confirm: "我已檢視 Pi 的修改，並同意取代這份示範副本。",
      synced: "— 示範內容已一致",
    };

// Fictional fixtures only: no filesystem, agent, model, or network access.
const targets = {
  codex: { name: "Codex", state: "missing" },
  opencode: { name: "OpenCode", state: "outdated" },
  pi: { name: "Pi", state: "modified" },
};
const app = document.querySelector("#demo-app");
const picker = document.querySelector("#target-picker");
const inputs = [...picker.querySelectorAll('input[name="target"]')];
const previewButton = document.querySelector("#preview-button");
const applyButton = document.querySelector("#apply-button");
const resetButton = document.querySelector("#reset-demo");
const status = document.querySelector("#demo-status");
const empty = document.querySelector("#demo-empty");
const panel = document.querySelector("#preview-panel");
const result = document.querySelector("#demo-result");
const diffList = document.querySelector("#diff-list");
const resultList = document.querySelector("#result-list");
const template = document.querySelector("#diff-template");
let preview = null;
let completed = false;

function selectedTargets() {
  return inputs.filter((input) => input.checked).map((input) => input.value);
}

function announce(message, warning = false) {
  status.textContent = message;
  status.dataset.tone = warning ? "warning" : "info";
}

function setStep(step) {
  for (const item of app.querySelectorAll("[data-step]")) {
    if (item.dataset.step === step) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  }
}

function updateApproval() {
  const unconfirmed = [...diffList.querySelectorAll("[data-confirm]")].some(
    (input) => !input.disabled && !input.checked,
  );
  applyButton.disabled = !preview || completed || unconfirmed;
  announce(unconfirmed ? copy.conflict : copy.ready, unconfirmed);
}

function clearPreview(initial = false) {
  preview = null;
  completed = false;
  diffList.replaceChildren();
  resultList.replaceChildren();
  panel.hidden = true;
  result.hidden = true;
  empty.hidden = false;
  picker.disabled = false;
  previewButton.disabled = selectedTargets().length === 0;
  applyButton.disabled = true;
  setStep("select");
  announce(
    previewButton.disabled
      ? copy.choose
      : initial
        ? copy.initial
        : copy.selected,
    previewButton.disabled,
  );
}

function addDiffLines(element, lines) {
  for (const line of lines) {
    const span = document.createElement("span");
    span.className = `diff-line ${line.startsWith("+") ? "add" : line.startsWith("-") ? "remove" : ""}`;
    span.textContent = line;
    element.append(span);
  }
}

function renderTarget(id) {
  const target = targets[id];
  const fragment = template.content.cloneNode(true);
  fragment.querySelector("[data-target-title]").textContent = target.name;
  const state = fragment.querySelector("[data-state]");
  state.textContent = copy[target.state];
  state.classList.toggle("warning", target.state === "modified");
  for (const label of fragment.querySelectorAll("[data-file-state]")) {
    label.textContent = target.state === "missing" ? copy.added : copy.changed;
  }
  const manifest = ["  name: code-review"];
  const references = [];
  if (target.state === "outdated") {
    manifest.push("- description: Review code changes.");
    references.push("- 1. Read the changed files.");
  } else if (target.state === "modified") {
    manifest.push("- description: Review with my local checklist.");
    references.push("- 1. Use the team-specific review checklist.");
  } else {
    manifest[0] = "+ name: code-review";
  }
  manifest.push("+ description: Review changes and verify tests.");
  references.push(
    "+ 1. Read the diff and its callers.",
    "+ 2. Verify behavior with tests.",
  );
  addDiffLines(fragment.querySelector("[data-manifest-diff]"), manifest);
  addDiffLines(fragment.querySelector("[data-reference-diff]"), references);
  const confirmation = fragment.querySelector("[data-confirm]");
  confirmation.disabled = target.state !== "modified";
  if (target.state === "modified") {
    fragment.querySelector(".conflict-confirm").hidden = false;
    fragment.querySelector("[data-confirm-text]").textContent = copy.confirm;
    confirmation.addEventListener("change", updateApproval);
  }
  return fragment;
}

for (const input of inputs) {
  input.addEventListener("change", () => clearPreview());
}

previewButton.addEventListener("click", () => {
  const selected = selectedTargets();
  if (!selected.length || completed) return;
  preview = selected;
  diffList.replaceChildren(...preview.map(renderTarget));
  empty.hidden = true;
  result.hidden = true;
  panel.hidden = false;
  setStep("preview");
  updateApproval();
  document.querySelector("#preview-title").focus();
});

applyButton.addEventListener("click", () => {
  if (!preview || completed || applyButton.disabled) return;
  completed = true;
  picker.disabled = true;
  previewButton.disabled = true;
  applyButton.disabled = true;
  resultList.replaceChildren();
  for (const id of preview) {
    const item = document.createElement("li");
    item.textContent = `${targets[id].name} ${copy.synced}`;
    resultList.append(item);
  }
  panel.hidden = true;
  empty.hidden = true;
  result.hidden = false;
  setStep("complete");
  announce(copy.done);
  document.querySelector("#result-title").focus();
});

resetButton.addEventListener("click", () => {
  for (const input of inputs) input.checked = input.value === "codex";
  clearPreview(true);
  inputs[0].focus();
});

clearPreview(true);
app.hidden = false;
initMotion();
