const english = document.documentElement.lang === "en";
const copy = english
  ? {
      choose: "Choose at least one target to preview.",
      selected: "Selection updated. Preview the differences before continuing.",
      initial: "Codex is selected. Preview the content before copying.",
      ready:
        "Preview ready. Review both files for each target before confirming.",
      conflict:
        "Pi has local edits. Review the differences and explicitly approve replacement to continue.",
      stale:
        "Files changed after this preview. Sync is blocked. Preview again and review any conflicts.",
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
      initial: "已選擇 Codex。先預覽，檢查將複製的內容。",
      ready: "預覽已就緒。確認前，請檢查每個目標的兩個檔案。",
      conflict: "Pi 有本機修改。請先檢查差異，並明確確認取代才能繼續。",
      stale: "檔案在預覽後已變更，同步已阻擋。請重新預覽，並再次確認衝突。",
      done: "示範同步完成。未操作任何真實檔案。",
      missing: "建立新副本",
      outdated: "來源已更新",
      modified: "目標有修改",
      added: "新增檔案",
      changed: "變更檔案",
      confirm: "我已檢視 Pi 的本機修改，並同意取代這份示範副本。",
      synced: "— 示範內容已一致",
    };

// Fictional fixtures only: no filesystem, agent, model, or network access.
const targets = {
  codex: { name: "Codex", state: "missing", folder: "codex" },
  opencode: { name: "OpenCode", state: "outdated", folder: "opencode" },
  pi: { name: "Pi", state: "modified", folder: "pi" },
};
const app = document.querySelector("#demo-app");
const picker = document.querySelector("#target-picker");
const inputs = [...picker.querySelectorAll('input[name="target"]')];
const previewButton = document.querySelector("#preview-button");
const applyButton = document.querySelector("#apply-button");
const invalidateButton = document.querySelector("#invalidate-button");
const resetButton = document.querySelector("#reset-demo");
const status = document.querySelector("#demo-status");
const empty = document.querySelector("#demo-empty");
const panel = document.querySelector("#preview-panel");
const result = document.querySelector("#demo-result");
const diffList = document.querySelector("#diff-list");
const resultList = document.querySelector("#result-list");
const template = document.querySelector("#diff-template");
let preview = null;
let stale = false;
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
  applyButton.disabled = !preview || stale || completed || unconfirmed;
  if (stale) announce(copy.stale, true);
  else announce(unconfirmed ? copy.conflict : copy.ready, unconfirmed);
}

function clearPreview(initial = false) {
  preview = null;
  stale = false;
  completed = false;
  diffList.replaceChildren();
  resultList.replaceChildren();
  panel.hidden = true;
  result.hidden = true;
  empty.hidden = false;
  picker.disabled = false;
  previewButton.disabled = selectedTargets().length === 0;
  applyButton.disabled = true;
  invalidateButton.disabled = true;
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
  fragment.querySelector("[data-target-path]").textContent =
    `C:/Demo/${target.folder}/skills/code-review`;
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
  stale = false;
  diffList.replaceChildren(...preview.map(renderTarget));
  empty.hidden = true;
  result.hidden = true;
  panel.hidden = false;
  invalidateButton.disabled = false;
  setStep("preview");
  updateApproval();
  document.querySelector("#preview-title").focus();
});

invalidateButton.addEventListener("click", () => {
  if (!preview || completed) return;
  stale = true;
  invalidateButton.disabled = true;
  for (const input of diffList.querySelectorAll("[data-confirm]")) {
    input.checked = false;
    input.disabled = true;
  }
  updateApproval();
  previewButton.focus();
});

applyButton.addEventListener("click", () => {
  if (!preview || stale || completed || applyButton.disabled) return;
  completed = true;
  picker.disabled = true;
  previewButton.disabled = true;
  applyButton.disabled = true;
  invalidateButton.disabled = true;
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
