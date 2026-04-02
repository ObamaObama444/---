const THEME_STORAGE_KEY = "reference-theme-v1";
const LIGHT_THEME = "light";
const DARK_THEME = "dark";
const DOC_FORUM_PROFILE_STORAGE_KEY = "open-room-profile-v1";
const DOC_COMMENT_POLL_INTERVAL_MS = 2500;
const DOC_FORUM_TOUCH_OPEN_DELAY_MS = 650;

const rootNode = document.documentElement;
const themeToggleNode = document.querySelector("#theme-toggle");
const readerNode = document.querySelector(".reader");
const docSearchNode = document.querySelector("#doc-search");
const docListNode = document.querySelector("#doc-list");
const categoryFilterNode = document.querySelector("#category-filter");
const docTotalCountNode = document.querySelector("#doc-total-count");
const visibleDocCountNode = document.querySelector("#visible-doc-count");
const categoryCountNode = document.querySelector("#category-count");
const readerCategoryNode = document.querySelector("#reader-category");
const readerLengthNode = document.querySelector("#reader-length");
const readerUpdatedNode = document.querySelector("#reader-updated");
const readerTitleNode = document.querySelector("#reader-title");
const readerSummaryNode = document.querySelector("#reader-summary");
const readerContentNode = document.querySelector("#reader-content");
const docForumToggleNode = document.querySelector("#doc-forum-toggle");
const docForumBackdropNode = document.querySelector("#doc-forum-backdrop");
const docForumPanelNode = document.querySelector("#doc-forum-panel");
const docForumCloseNode = document.querySelector("#doc-forum-close");
const docForumRootNode = document.querySelector("#doc-forum-root");
const docForumModuleLabelNode = document.querySelector("#doc-forum-module-label");
const docForumTitleNode = document.querySelector("#doc-forum-title");

let DOC_LIBRARY = [];
const docCommentsState = createDocCommentsState();
let isDocForumOpen = false;
let isDocForumToggleHovered = false;
let docForumTouchOpenTimerId = null;

function initTheme() {
  const nextTheme = readStoredTheme();
  applyTheme(nextTheme);

  if (!themeToggleNode) {
    return;
  }

  themeToggleNode.addEventListener("click", () => {
    const currentTheme = rootNode.dataset.theme === DARK_THEME ? DARK_THEME : LIGHT_THEME;
    const next = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME;
    applyTheme(next);

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (_error) {
      // Ignore storage write failures.
    }
  });
}

function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === DARK_THEME ? DARK_THEME : LIGHT_THEME;
  } catch (_error) {
    return LIGHT_THEME;
  }
}

function applyTheme(theme) {
  if (theme === DARK_THEME) {
    rootNode.dataset.theme = DARK_THEME;
  } else {
    delete rootNode.dataset.theme;
  }

  if (!themeToggleNode) {
    return;
  }

  const nextLabel = theme === DARK_THEME ? "Включить светлую тему" : "Включить темную тему";
  const nextTitle = theme === DARK_THEME ? "Светлая тема" : "Темная тема";
  themeToggleNode.setAttribute("aria-label", nextLabel);
  themeToggleNode.setAttribute("title", nextTitle);
}

function createDocCommentsState() {
  return {
    profile: loadDocForumProfile(),
    activeDocId: "",
    items: [],
    lastId: "",
    pendingFiles: [],
    isSubmitting: false,
    isPolling: false,
    pollTimerId: null,
    listNode: null,
    countNode: null,
    inputNode: null,
    fileInputNode: null,
    attachmentStripNode: null,
    attachButtonNode: null,
    sendButtonNode: null,
  };
}

function initDocForumToggle() {
  if (
    !docForumToggleNode ||
    !docForumPanelNode ||
    !docForumBackdropNode ||
    !docForumCloseNode ||
    !docForumRootNode
  ) {
    return;
  }

  docForumToggleNode.addEventListener("click", (event) => {
    event.preventDefault();
  });

  docForumToggleNode.addEventListener("pointerenter", () => {
    isDocForumToggleHovered = true;

    if (!isDocForumOpen) {
      docForumToggleNode.focus({ preventScroll: true });
    }
  });

  docForumToggleNode.addEventListener("pointerleave", () => {
    isDocForumToggleHovered = false;

    if (!isDocForumOpen && document.activeElement === docForumToggleNode) {
      docForumToggleNode.blur();
    }
  });

  docForumToggleNode.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Spacebar") {
      return;
    }

    if (!isDocForumToggleHovered || isDocForumOpen) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    setDocForumOpen(true, { focusComposer: true });
  });

  docForumToggleNode.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") {
      return;
    }

    clearDocForumTouchOpenTimer();
    docForumTouchOpenTimerId = window.setTimeout(() => {
      docForumTouchOpenTimerId = null;
      setDocForumOpen(true, { focusComposer: true });
    }, DOC_FORUM_TOUCH_OPEN_DELAY_MS);
  });

  docForumToggleNode.addEventListener("pointerup", clearDocForumTouchOpenTimer);
  docForumToggleNode.addEventListener("pointercancel", clearDocForumTouchOpenTimer);
  docForumToggleNode.addEventListener("pointermove", clearDocForumTouchOpenTimer);
  docForumToggleNode.addEventListener("blur", () => {
    isDocForumToggleHovered = false;
    clearDocForumTouchOpenTimer();
  });

  docForumCloseNode.addEventListener("click", () => {
    setDocForumOpen(false, { restoreToggleFocus: true });
  });

  docForumBackdropNode.addEventListener("click", () => {
    setDocForumOpen(false, { restoreToggleFocus: true });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isDocForumOpen) {
      setDocForumOpen(false, { restoreToggleFocus: true });
    }
  });

  setDocForumOpen(false);
}

function setDocForumOpen(nextState, options = {}) {
  if (!docForumPanelNode || !docForumBackdropNode || !docForumToggleNode) {
    return;
  }

  const { focusComposer = false, restoreToggleFocus = false } = options;
  isDocForumOpen = nextState;

  docForumPanelNode.classList.toggle("is-open", nextState);
  docForumPanelNode.setAttribute("aria-hidden", String(!nextState));
  docForumBackdropNode.hidden = !nextState;
  docForumToggleNode.setAttribute("aria-expanded", String(nextState));

  if ("inert" in docForumPanelNode) {
    docForumPanelNode.inert = !nextState;
  }

  if (!nextState) {
    if (restoreToggleFocus) {
      docForumToggleNode.focus({ preventScroll: true });
    }

    return;
  }

  if (docCommentsState.activeDocId) {
    void docSyncComments(true);
  }

  requestAnimationFrame(() => {
    docScrollCommentListToBottom();

    if (focusComposer && docCommentsState.inputNode) {
      docCommentsState.inputNode.focus();
    }
  });
}

function clearDocForumTouchOpenTimer() {
  if (!docForumTouchOpenTimerId) {
    return;
  }

  window.clearTimeout(docForumTouchOpenTimerId);
  docForumTouchOpenTimerId = null;
}

function loadDocForumProfile() {
  try {
    const raw = localStorage.getItem(DOC_FORUM_PROFILE_STORAGE_KEY);

    if (!raw) {
      const profile = createDocForumProfile();
      localStorage.setItem(DOC_FORUM_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      return profile;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || !parsed.profileId || !parsed.nickname) {
      const profile = createDocForumProfile();
      localStorage.setItem(DOC_FORUM_PROFILE_STORAGE_KEY, JSON.stringify(profile));
      return profile;
    }

    return {
      profileId: String(parsed.profileId),
      nickname: String(parsed.nickname),
    };
  } catch (_error) {
    return createDocForumProfile();
  }
}

function createDocForumProfile() {
  return {
    profileId: docGenerateProfileId(),
    nickname: `Гость ${Math.floor(1000 + Math.random() * 9000)}`,
  };
}

function docGenerateProfileId() {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }

    if (typeof crypto.getRandomValues === "function") {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;

      const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
      return [
        hex.slice(0, 4).join(""),
        hex.slice(4, 6).join(""),
        hex.slice(6, 8).join(""),
        hex.slice(8, 10).join(""),
        hex.slice(10, 16).join(""),
      ].join("-");
    }
  }

  return `doc-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function docFormatNumber(value) {
  return String(value).padStart(2, "0");
}

function initDocsLibrary() {
  const state = {
    query: "",
    category: "All",
    activeDocId: "",
  };

  const categories = ["All", ...new Set(DOC_LIBRARY.map((doc) => doc.category))];
  docTotalCountNode.textContent = `${DOC_LIBRARY.length} docs`;
  categoryCountNode.textContent = `${docFormatNumber(categories.length - 1)} collections`;
  startDocCommentsPolling();
  initDocForumToggle();

  docSearchNode.addEventListener("input", () => {
    state.query = docSearchNode.value.trim().toLowerCase();
    syncVisibleState();
  });

  window.addEventListener("hashchange", () => {
    const docFromHash = findDocById(readDocIdFromHash());

    if (!docFromHash) {
      return;
    }

    state.activeDocId = docFromHash.id;
    syncVisibleState();
  });

  renderCategoryFilter(categories, state, syncVisibleState);

  const initialDoc = findDocById(readDocIdFromHash()) || DOC_LIBRARY[0];
  state.activeDocId = initialDoc.id;
  syncVisibleState();

  function syncVisibleState() {
    const filteredDocs = filterDocs(state);
    visibleDocCountNode.textContent = `${filteredDocs.length} visible`;

    if (!filteredDocs.length) {
      renderDocList([], state, () => {});
      renderEmptyReader();
      return;
    }

    if (!filteredDocs.some((doc) => doc.id === state.activeDocId)) {
      state.activeDocId = filteredDocs[0].id;
    }

    const handleSelect = (docId) => {
      state.activeDocId = docId;
      renderDocList(filteredDocs, state, handleSelect);
      openDoc(findDocById(docId), { shouldScroll: true });
    };

    renderDocList(filteredDocs, state, handleSelect);
    openDoc(findDocById(state.activeDocId), { updateHash: false });
  }
}

function filterDocs(state) {
  return DOC_LIBRARY.filter((doc) => {
    const matchesCategory = state.category === "All" || doc.category === state.category;
    const haystack = [
      doc.title,
      doc.summary,
      doc.category,
      ...(doc.tags || []),
      ...doc.sections.flatMap((section) => [...(section.paragraphs || []), ...(section.bullets || [])]),
    ]
      .join(" ")
      .toLowerCase();
    const matchesQuery = !state.query || haystack.includes(state.query);
    return matchesCategory && matchesQuery;
  });
}

function renderCategoryFilter(categories, state, onChange) {
  categoryFilterNode.textContent = "";

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-pill";
    button.textContent = category;

    if (category === state.category) {
      button.classList.add("is-active");
    }

    button.addEventListener("click", () => {
      state.category = category;
      renderCategoryFilter(categories, state, onChange);
      onChange();
    });

    categoryFilterNode.append(button);
  });
}

function renderDocList(docs, state, onSelect) {
  docListNode.textContent = "";

  if (!docs.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "По текущему фильтру ничего не найдено.";
    docListNode.append(empty);
    return;
  }

  const groups = new Map();

  docs.forEach((doc) => {
    if (!groups.has(doc.category)) {
      groups.set(doc.category, []);
    }

    groups.get(doc.category).push(doc);
  });

  groups.forEach((items, category) => {
    const section = document.createElement("section");
    section.className = "doc-group";

    const head = document.createElement("div");
    head.className = "doc-group__head";

    const title = document.createElement("span");
    title.textContent = category;

    const count = document.createElement("span");
    count.textContent = `${docFormatNumber(items.length)} docs`;

    head.append(title, count);
    section.append(head);

    items.forEach((doc) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "doc-item";
      button.dataset.docId = doc.id;

      if (doc.id === state.activeDocId) {
        button.classList.add("is-active");
      }

      const titleRow = document.createElement("div");
      titleRow.className = "doc-item__head";

      const identity = document.createElement("div");
      identity.className = "doc-item__identity";

      const number = document.createElement("span");
      number.className = "doc-item__number";
      number.textContent = docFormatNumber(doc.number);

      const name = document.createElement("h3");
      name.textContent = doc.title;

      const length = document.createElement("span");
      length.textContent = doc.readTime;

      identity.append(number, name);
      titleRow.append(identity, length);

      const summary = document.createElement("p");
      summary.textContent = doc.summary;

      const meta = document.createElement("div");
      meta.className = "doc-item__meta";

      (doc.tags || []).slice(0, 4).forEach((tag) => {
        const chip = document.createElement("span");
        chip.textContent = tag;
        meta.append(chip);
      });

      button.append(titleRow, summary, meta);
      button.addEventListener("click", () => onSelect(doc.id));
      section.append(button);
    });

    docListNode.append(section);
  });
}

function openDoc(doc, options = {}) {
  if (!doc) {
    renderEmptyReader();
    return;
  }

  const { updateHash = true, shouldScroll = false } = options;
  readerCategoryNode.textContent = doc.category;
  readerLengthNode.textContent = doc.readTime;
  readerUpdatedNode.textContent = doc.updated;
  readerTitleNode.textContent = `${docFormatNumber(doc.number)}. ${doc.title}`;
  readerSummaryNode.textContent = doc.summary;

  readerContentNode.textContent = "";
  readerContentNode.append(renderTagRow(doc.tags));

  doc.sections.forEach((section) => {
    readerContentNode.append(renderDocSection(section));
  });

  mountDocCommentsSection(doc);
  activateDocCommentsThread(doc.id);

  if (updateHash) {
    window.history.replaceState(null, "", `#${doc.id}`);
  }

  if (shouldScroll) {
    scrollReaderToTop();
  }
}

function scrollReaderToTop() {
  const behavior = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth";
  if (typeof readerNode.scrollTo === "function") {
    readerNode.scrollTo({ top: 0, behavior });
  } else {
    readerNode.scrollTop = 0;
  }

  const readerTop = window.scrollY + readerNode.getBoundingClientRect().top - 18;
  window.scrollTo({ top: Math.max(0, readerTop), behavior });
}

function renderTagRow(tags) {
  const row = document.createElement("div");
  row.className = "reader-tags";

  (tags || []).forEach((tag) => {
    const chip = document.createElement("span");
    chip.textContent = tag;
    row.append(chip);
  });

  return row;
}

function renderDocSection(section) {
  const node = document.createElement("section");
  node.className = "reader-section";

  const title = document.createElement("h3");
  title.textContent = section.title;
  node.append(title);

  (section.paragraphs || []).forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    node.append(p);
  });

  if (section.bullets?.length) {
    const list = document.createElement("ul");

    section.bullets.forEach((bullet) => {
      const item = document.createElement("li");
      item.textContent = bullet;
      list.append(item);
    });

    node.append(list);
  }

  if (section.code) {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    code.textContent = section.code;
    pre.append(code);
    node.append(pre);
  }

  return node;
}

function renderDocCommentsSection(doc) {
  const section = document.createElement("section");
  section.className = "reader-comments";

  const head = document.createElement("div");
  head.className = "reader-comments__head";

  const titleWrap = document.createElement("div");

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = `Module ${docFormatNumber(doc.number)}`;

  const title = document.createElement("h3");
  title.textContent = "Комментарии";

  const hint = document.createElement("p");
  hint.className = "reader-comments__hint";
  hint.textContent = "Гости могут отправлять сюда текст и файлы по этому модулю.";

  titleWrap.append(eyebrow, title, hint);

  const count = document.createElement("span");
  count.className = "reader-comments__count";
  count.textContent = "0 комментариев";

  head.append(titleWrap, count);

  const list = document.createElement("div");
  list.className = "reader-comments__list";

  const form = document.createElement("form");
  form.className = "reader-comments__composer";

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.hidden = true;

  const attachmentStrip = document.createElement("div");
  attachmentStrip.className = "attachment-strip";
  attachmentStrip.hidden = true;

  const row = document.createElement("div");
  row.className = "composer-row";

  const attachButton = document.createElement("button");
  attachButton.className = "icon-button";
  attachButton.type = "button";
  attachButton.setAttribute("aria-label", "Прикрепить файл к комментарию");
  attachButton.setAttribute("title", "Прикрепить файл");
  attachButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.5 12.5 15 6a3.5 3.5 0 1 1 5 5l-9 9a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.8"
      />
    </svg>`;

  const messageBox = document.createElement("label");
  messageBox.className = "message-box";

  const input = document.createElement("textarea");
  input.rows = 1;
  input.maxLength = 1500;
  input.placeholder = "Комментарий по модулю";
  messageBox.append(input);

  const sendButton = document.createElement("button");
  sendButton.className = "icon-button icon-button--send";
  sendButton.type = "submit";
  sendButton.setAttribute("aria-label", "Отправить комментарий");
  sendButton.setAttribute("title", "Отправить");
  sendButton.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21 3 10 14"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.8"
      />
      <path
        d="m21 3-7 18-4-7-7-4 18-7Z"
        fill="none"
        stroke="currentColor"
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.8"
      />
    </svg>`;

  row.append(attachButton, messageBox, sendButton);
  form.append(fileInput, attachmentStrip, row);
  section.append(head, list, form);

  docCommentsState.listNode = list;
  docCommentsState.countNode = count;
  docCommentsState.inputNode = input;
  docCommentsState.fileInputNode = fileInput;
  docCommentsState.attachmentStripNode = attachmentStrip;
  docCommentsState.attachButtonNode = attachButton;
  docCommentsState.sendButtonNode = sendButton;

  attachButton.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    docQueueCommentFiles(fileInput.files);
    fileInput.value = "";
  });

  input.addEventListener("input", () => {
    docAutoResizeCommentInput();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void docSubmitComment();
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void docSubmitComment();
  });

  docAutoResizeCommentInput();
  docRenderCommentAttachmentStrip();
  docRenderCommentList();

  return section;
}

function mountDocCommentsSection(doc) {
  if (!docForumRootNode || !docForumModuleLabelNode || !docForumTitleNode) {
    return;
  }

  docForumModuleLabelNode.textContent = `Module ${docFormatNumber(doc.number)}`;
  docForumTitleNode.textContent = `Форум модуля ${docFormatNumber(doc.number)}`;
  docForumRootNode.textContent = "";
  docForumRootNode.append(renderDocCommentsSection(doc));
}

function activateDocCommentsThread(docId) {
  const isNewDoc = docCommentsState.activeDocId !== docId;
  docCommentsState.activeDocId = docId;
  docCommentsState.profile = loadDocForumProfile();

  if (isNewDoc) {
    docCommentsState.items = [];
    docCommentsState.lastId = "";
    docCommentsState.pendingFiles = [];
  }

  docRenderCommentAttachmentStrip();
  docRenderCommentList();
  void docSyncComments(true);
}

function startDocCommentsPolling() {
  if (docCommentsState.pollTimerId) {
    return;
  }

  docCommentsState.pollTimerId = window.setInterval(() => {
    if (!docCommentsState.activeDocId || !isDocForumOpen) {
      return;
    }

    void docSyncComments(false);
  }, DOC_COMMENT_POLL_INTERVAL_MS);
}

async function docSyncComments(reset) {
  if (docCommentsState.isPolling || !docCommentsState.activeDocId) {
    return;
  }

  const docId = docCommentsState.activeDocId;
  docCommentsState.isPolling = true;

  try {
    const search = new URLSearchParams({ docId });

    if (!reset && docCommentsState.lastId) {
      search.set("after", docCommentsState.lastId);
    }

    const payload = await docRequestJson(`/api/comments.php?${search.toString()}`);
    const incoming = Array.isArray(payload.comments) ? payload.comments : [];

    if (docCommentsState.activeDocId !== docId) {
      return;
    }

    docCommentsState.items = reset
      ? incoming
      : docMergeCommentItems(docCommentsState.items, incoming);
    docCommentsState.lastId =
      docCommentsState.items.length > 0
        ? String(docCommentsState.items[docCommentsState.items.length - 1].id || "")
        : "";
    docRenderCommentList();
  } catch (_error) {
    // Ignore polling hiccups for comments.
  } finally {
    docCommentsState.isPolling = false;
  }
}

function docMergeCommentItems(existing, incoming) {
  const next = [...existing];
  const ids = new Set(next.map((item) => item.id));

  incoming.forEach((item) => {
    if (!item?.id || ids.has(item.id)) {
      return;
    }

    ids.add(item.id);
    next.push(item);
  });

  return next.slice(-300);
}

function docRenderCommentList() {
  if (!docCommentsState.listNode || !docCommentsState.countNode) {
    return;
  }

  docCommentsState.listNode.textContent = "";
  docCommentsState.countNode.textContent = `${docCommentsState.items.length} комментариев`;

  if (docCommentsState.items.length === 0) {
    const empty = document.createElement("div");
    empty.className = "reader-comments__empty";
    empty.textContent = "Пока пусто. Можно оставить первый комментарий или прикрепить файл.";
    docCommentsState.listNode.append(empty);
    return;
  }

  docCommentsState.items.forEach((comment) => {
    docCommentsState.listNode.append(docRenderCommentItem(comment));
  });

  docScrollCommentListToBottom();
}

function docScrollCommentListToBottom() {
  if (!docCommentsState.listNode) {
    return;
  }

  docCommentsState.listNode.scrollTop = docCommentsState.listNode.scrollHeight;
}

function docRenderCommentItem(comment) {
  const article = document.createElement("article");
  article.className = "doc-comment";

  if (comment.profileId === docCommentsState.profile.profileId) {
    article.classList.add("is-own");
  }

  const meta = document.createElement("div");
  meta.className = "doc-comment__meta";

  const author = document.createElement("span");
  author.className = "doc-comment__author";
  author.textContent = comment.author || "Гость";

  const time = document.createElement("span");
  time.textContent = docFormatCommentTime(comment.createdAt);

  meta.append(author, time);
  article.append(meta);

  if (comment.text) {
    const text = document.createElement("div");
    text.className = "doc-comment__text";
    text.textContent = comment.text;
    article.append(text);
  }

  if (comment.file) {
    const file = comment.file;

    if (docIsImageFile(file)) {
      const previewLink = document.createElement("a");
      previewLink.className = "doc-comment__image-link";
      previewLink.href = docBuildInlineFileUrl(file.id);
      previewLink.target = "_blank";
      previewLink.rel = "noreferrer";

      const image = document.createElement("img");
      image.className = "doc-comment__image";
      image.src = docBuildInlineFileUrl(file.id);
      image.alt = file.originalName;
      image.loading = "lazy";

      previewLink.append(image);
      article.append(previewLink);
    }

    const fileBox = document.createElement("div");
    fileBox.className = "doc-comment__file";

    const info = document.createElement("div");
    info.className = "doc-comment__file-info";

    const name = document.createElement("span");
    name.className = "doc-comment__file-name";
    name.textContent = file.originalName;

    const size = document.createElement("span");
    size.className = "doc-comment__file-size";
    size.textContent = `${docFormatBytes(file.size)} • ${file.mimeType || "файл"}`;

    info.append(name, size);

    const actions = document.createElement("div");
    actions.className = "file-actions";

    if (docIsImageFile(file)) {
      const openLink = document.createElement("a");
      openLink.className = "file-link";
      openLink.href = docBuildInlineFileUrl(file.id);
      openLink.target = "_blank";
      openLink.rel = "noreferrer";
      openLink.textContent = "Открыть";
      actions.append(openLink);
    }

    const downloadLink = document.createElement("a");
    downloadLink.className = "file-link";
    downloadLink.href = docBuildDownloadFileUrl(file.id);
    downloadLink.textContent = "Скачать";
    downloadLink.setAttribute("download", file.originalName);
    actions.append(downloadLink);

    fileBox.append(info, actions);
    article.append(fileBox);
  }

  return article;
}

function docQueueCommentFiles(fileList) {
  const files = [...(fileList || [])].filter((file) => file.size > 0);

  if (!files.length) {
    return;
  }

  docCommentsState.pendingFiles = [...docCommentsState.pendingFiles, ...files];
  docRenderCommentAttachmentStrip();
}

function docRenderCommentAttachmentStrip() {
  if (!docCommentsState.attachmentStripNode) {
    return;
  }

  const strip = docCommentsState.attachmentStripNode;
  strip.textContent = "";
  strip.hidden = docCommentsState.pendingFiles.length === 0;

  docCommentsState.pendingFiles.forEach((file, index) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";

    const name = document.createElement("span");
    name.className = "attachment-chip__name";
    name.textContent = file.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "attachment-chip__remove";
    remove.setAttribute("aria-label", `Убрать ${file.name}`);
    remove.textContent = "x";
    remove.addEventListener("click", () => {
      docCommentsState.pendingFiles = docCommentsState.pendingFiles.filter((_, currentIndex) => currentIndex !== index);
      docRenderCommentAttachmentStrip();
    });

    chip.append(name, remove);
    strip.append(chip);
  });
}

function docSetCommentComposerBusy(isBusy) {
  if (docCommentsState.attachButtonNode) {
    docCommentsState.attachButtonNode.disabled = isBusy;
  }

  if (docCommentsState.sendButtonNode) {
    docCommentsState.sendButtonNode.disabled = isBusy;
  }

  if (docCommentsState.inputNode) {
    docCommentsState.inputNode.disabled = isBusy;
  }
}

async function docSubmitComment() {
  if (docCommentsState.isSubmitting || !docCommentsState.activeDocId) {
    return;
  }

  const text = docCommentsState.inputNode ? docCommentsState.inputNode.value.trim() : "";
  const files = [...docCommentsState.pendingFiles];

  if (!text && files.length === 0) {
    return;
  }

  const docId = docCommentsState.activeDocId;
  docCommentsState.isSubmitting = true;
  docSetCommentComposerBusy(true);

  try {
    if (text) {
      const payload = await docRequestJson("/api/comments.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          docId,
          profileId: docCommentsState.profile.profileId,
          nickname: docCommentsState.profile.nickname,
          text,
        }),
      });

      if (docCommentsState.activeDocId === docId) {
        docCommentsState.items = docMergeCommentItems(docCommentsState.items, [payload.comment]);
        docCommentsState.lastId = String(payload.comment.id || docCommentsState.lastId);
        docRenderCommentList();
      }
    }

    if (docCommentsState.inputNode) {
      docCommentsState.inputNode.value = "";
      docAutoResizeCommentInput();
      docCommentsState.inputNode.focus();
    }

    docCommentsState.pendingFiles = [];
    docRenderCommentAttachmentStrip();

    if (files.length > 0) {
      void docUploadCommentFilesInBackground(docId, files);
    }
  } catch (error) {
    window.alert(error.message || "Не удалось отправить комментарий.");
  } finally {
    docCommentsState.isSubmitting = false;
    docSetCommentComposerBusy(false);
  }
}

async function docUploadCommentFilesInBackground(docId, files) {
  for (const file of files) {
    try {
      const payload = await docUploadCommentFile(docId, file);

      if (docCommentsState.activeDocId !== docId) {
        continue;
      }

      docCommentsState.items = docMergeCommentItems(docCommentsState.items, [payload.comment]);
      docCommentsState.lastId = String(payload.comment.id || docCommentsState.lastId);
      docRenderCommentList();
    } catch (error) {
      window.alert(error.message || `Не удалось загрузить файл ${file.name}.`);
    }
  }
}

async function docUploadCommentFile(docId, file) {
  const formData = new FormData();
  formData.append("docId", docId);
  formData.append("profileId", docCommentsState.profile.profileId);
  formData.append("nickname", docCommentsState.profile.nickname);
  formData.append("file", file);

  return docRequestJson("/api/comment-upload.php", {
    method: "POST",
    body: formData,
  });
}

function docAutoResizeCommentInput() {
  if (!docCommentsState.inputNode) {
    return;
  }

  docCommentsState.inputNode.style.height = "auto";
  docCommentsState.inputNode.style.height = `${Math.min(Math.max(docCommentsState.inputNode.scrollHeight, 54), 180)}px`;
}

async function docRequestJson(url, options = {}) {
  const response = await fetch(url, options);
  const raw = await response.text();

  let payload = {};

  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (_error) {
    payload = {};
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Запрос завершился с ошибкой.");
  }

  return payload;
}

function docBuildInlineFileUrl(fileId) {
  return `/api/file.php?id=${encodeURIComponent(fileId)}&mode=inline`;
}

function docBuildDownloadFileUrl(fileId) {
  return `/api/file.php?id=${encodeURIComponent(fileId)}&mode=download`;
}

function docIsImageFile(file) {
  return String(file.mimeType || "").startsWith("image/");
}

function docFormatBytes(value) {
  if (!Number.isFinite(value)) {
    return "0 Б";
  }

  const units = ["Б", "КБ", "МБ", "ГБ"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function docFormatCommentTime(value) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (_error) {
    return "--:--";
  }
}

function renderEmptyReader() {
  docCommentsState.activeDocId = "";
  docCommentsState.items = [];
  docCommentsState.lastId = "";
  if (docForumRootNode) {
    docForumRootNode.textContent = "";
  }
  if (docForumModuleLabelNode) {
    docForumModuleLabelNode.textContent = "";
  }
  if (docForumTitleNode) {
    docForumTitleNode.textContent = "Форум модуля";
  }
  readerCategoryNode.textContent = "Library";
  readerLengthNode.textContent = "";
  readerUpdatedNode.textContent = "";
  readerTitleNode.textContent = "Ничего не найдено";
  readerSummaryNode.textContent = "Попробуй другой поисковый запрос или сними часть фильтров.";
  readerContentNode.textContent = "";
}

function readDocIdFromHash() {
  return String(window.location.hash || "").replace(/^#/, "");
}

function findDocById(id) {
  return DOC_LIBRARY.find((doc) => doc.id === id) || null;
}

function buildDoc(config) {
  const sections = [
    {
      title: config.introTitle || "Обзор",
      paragraphs: config.overview || [],
    },
    {
      title: config.conceptsTitle || "Ключевые идеи",
      paragraphs: config.conceptsIntro || [],
      bullets: config.keyPoints || [],
    },
    {
      title: config.workflowTitle || "Рабочий контур",
      paragraphs: config.workflowIntro || [],
      bullets: config.workflow || [],
    },
    {
      title: config.pitfallsTitle || "Типовые ошибки",
      bullets: config.pitfalls || [],
    },
    {
      title: config.referenceTitle || "Опорный пример",
      paragraphs: config.referenceIntro || [],
      code: config.example || "",
    },
    {
      title: config.checklistTitle || "Чеклист",
      bullets: config.checklist || [],
    },
  ].filter(hasSectionContent);

  return {
    id: config.id,
    category: config.category,
    title: config.title,
    readTime: config.readTime,
    updated: config.updated,
    summary: config.summary,
    tags: config.tags,
    sections,
  };
}

function hasSectionContent(section) {
  return Boolean(
    (section.paragraphs && section.paragraphs.length) ||
      (section.bullets && section.bullets.length) ||
      section.code
  );
}

const DOC_CONFIGS = [
  {
    id: "numpy-reference",
    category: "Python",
    title: "NumPy Reference",
    readTime: "16 min",
    updated: "rev 2026.04",
    summary: "Реальная рабочая памятка по ndarray, broadcasting, shape discipline и быстрой численной обработке.",
    tags: ["numpy", "arrays", "broadcasting", "linear-algebra"],
    overview: [
      "NumPy стоит воспринимать как библиотеку плотных n-мерных массивов, вокруг которой строится почти весь классический научный Python. Ее сила не только в скорости, но и в том, что она заставляет работать с формой данных явно.",
      "На практике основная ценность приходит тогда, когда ты перестаешь писать циклы по элементам и начинаешь мыслить преобразованиями целого массива: reshape, transpose, stacking, masking и batch-операциями по осям.",
    ],
    keyPoints: [
      "shape и dtype надо проверять раньше, чем оптимизацию",
      "broadcasting позволяет логически расширять измерения без физического копирования",
      "views дешевле копий, но требуют понимания того, кто владеет памятью",
      "axis определяет направление агрегации, а keepdims помогает не терять совместимость форм",
      "в матричных вычислениях лучше явно отделять elementwise операции и матричное умножение",
    ],
    workflowIntro: [
      "Нормальный рабочий контур обычно выглядит так: загрузка массива → проверка dtype/shape → нормализация → агрегация или линейная алгебра → финальный срез или экспорт результата.",
    ],
    workflow: [
      "в начале задачи распечатай форму всех промежуточных массивов",
      "если работаешь с float, заранее реши, нужен float32 или float64",
      "для масок используй boolean arrays, а не индексы, пока не нужна оптимизация памяти",
      "для устойчивых пайплайнов держи вычисления чистыми и не мутируй массивы без необходимости",
    ],
    pitfalls: [
      "неявные копии после fancy indexing могут съесть память",
      "reshape работает только при сохранении числа элементов",
      "broadcasting легко скрывает ошибку, если оси совпали случайно",
      "смешивание int и float без явного контроля dtype приводит к тихим преобразованиям",
    ],
    referenceIntro: [
      "Ниже минимальный опорный пример: центрирование по колонкам, линейная комбинация признаков и фильтрация результата.",
    ],
    example: `import numpy as np

x = np.arange(24, dtype=np.float64).reshape(6, 4)
weights = np.array([0.3, -0.2, 0.5, 0.1])

centered = x - x.mean(axis=0, keepdims=True)
score = centered @ weights
mask = score > score.mean()

selected = x[mask]
print(selected)`,
    checklist: [
      "можешь ли ты объяснить, где в этом пайплайне создаются копии",
      "понимаешь ли ты, какие оси участвуют в агрегации",
      "умеешь ли быстро проверить совместимость shape до запуска вычисления",
      "есть ли тестовый пример с маленькими числами, который можно проверить вручную",
    ],
  },
  {
    id: "pandas-handbook",
    category: "Python",
    title: "Pandas Handbook",
    readTime: "18 min",
    updated: "rev 2026.04",
    summary: "Сводка по таблицам, merge, groupby, временным рядам и аккуратной подготовке витрин.",
    tags: ["pandas", "dataframe", "etl", "analytics"],
    overview: [
      "Pandas хорош, когда задача — это не просто загрузить CSV, а получить устойчивый и повторяемый пайплайн преобразования таблиц. Главная дисциплина здесь — явные типы, предсказуемые merge и контроль за размером таблицы после каждого шага.",
      "Для отчетов и продуктовой аналитики pandas остается очень сильным инструментом, если код строится как последовательность маленьких проверяемых преобразований, а не как один длинный ноутбучный монолит.",
    ],
    keyPoints: [
      "parse_dates и astype лучше задавать как можно раньше",
      "merge нужен с validate, если ты ожидаешь строгую кардинальность",
      "groupby лучше воспринимать как материализацию новой таблицы агрегатов",
      "index полезен для адресации, но редко должен быть бизнес-сущностью",
      "assign и pipe помогают делать преобразования читаемыми",
    ],
    workflowIntro: [
      "Рабочий контур часто выглядит так: ingest → type cleanup → null checks → business joins → derived features → groupby/pivot → export.",
    ],
    workflow: [
      "после каждого merge проверяй число строк и распределение null",
      "не тяни object-колонки, если можешь сделать category или datetime",
      "для временных данных заранее реши часовой пояс и гранулярность",
      "финальную витрину делай плоской и явной, без скрытых индексов",
    ],
    pitfalls: [
      "many_to_many merge легко умножает таблицу без заметного сигнала",
      "object-тип скрывает ошибки форматирования и пропуски",
      "инкрементальные отчеты ломаются, если не стабилизировать дедупликацию по ключам",
      "цепочки inplace-операций мешают отладке и тестированию",
    ],
    referenceIntro: [
      "Этот шаблон покрывает типичный сценарий: продажи, пользователи, месяц, страна и агрегаты для отчета.",
    ],
    example: `import pandas as pd

orders = pd.read_csv("orders.csv", parse_dates=["created_at"])
users = pd.read_csv("users.csv")

report = (
    orders
    .merge(users, on="user_id", how="left", validate="many_to_one")
    .assign(month=lambda df: df["created_at"].dt.to_period("M").astype(str))
    .groupby(["month", "country"], as_index=False)
    .agg(
        revenue=("amount", "sum"),
        orders=("order_id", "nunique"),
        users=("user_id", "nunique"),
    )
    .sort_values(["month", "revenue"], ascending=[True, False])
)

print(report.head())`,
    checklist: [
      "понятна ли кардинальность каждого merge",
      "проверены ли пропуски и дубликаты ключей",
      "стабильна ли логика временных зон и округления дат",
      "можно ли прогнать тот же пайплайн без ноутбука, из чистого скрипта",
    ],
  },
  {
    id: "fastapi-guide",
    category: "Python",
    title: "FastAPI Guide",
    readTime: "17 min",
    updated: "rev 2026.04",
    summary: "Практическая документация по роутам, схемам, зависимостям, валидации и рабочему API-контракту.",
    tags: ["fastapi", "api", "pydantic", "backend"],
    overview: [
      "FastAPI хорош тем, что связывает типы Python, валидацию входа и HTTP-контракт в одну систему. Это ускоряет не только старт проекта, но и последующую поддержку, потому что схема API постоянно остается рядом с кодом.",
      "Главная ошибка — превращать обработчики маршрутов в место, где живет вся бизнес-логика. Хороший FastAPI-проект тонкий на уровне контроллеров и явный на уровне сервисов и схем.",
    ],
    keyPoints: [
      "отделяй transport models от внутренних доменных объектов",
      "dependency injection используй для db-session, auth и feature gates",
      "health и readiness держи простыми и дешевыми",
      "ошибки делай предсказуемыми по форме и статус-кодам",
      "async endpoint полезен только там, где есть реальная асинхронная работа",
    ],
    workflowIntro: [
      "Нормальная структура: router → service → repository или gateway, а pydantic-модели описывают вход и выход на границе.",
    ],
    workflow: [
      "на уровне router собирай запрос и делегируй доменную логику вниз",
      "валидацию бизнес-правил, не сводимых к типам, держи в сервисном слое",
      "используй response_model там, где контракт должен быть жестким",
      "middleware подключай только для общесистемных задач, а не локальных условий",
    ],
    pitfalls: [
      "смешивание sync ORM и async endpoints дает скрытые блокировки",
      "лишние зависимости усложняют дебаг и тесты",
      "слишком богатые схемы ответа ломают обратную совместимость",
      "генерация OpenAPI не заменяет человеческую документацию сценариев",
    ],
    referenceIntro: [
      "Ниже минимальный каркас маршрута с pydantic-схемой и понятной ошибкой валидации бизнес-правила.",
    ],
    example: `from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI()

class ItemIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    price: float

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/items")
async def create_item(payload: ItemIn):
    if payload.price < 0:
        raise HTTPException(status_code=400, detail="price must be >= 0")
    return {"ok": True, "item": payload.model_dump()}`,
    checklist: [
      "есть ли отдельные схемы для input и output",
      "понятно ли, где живет auth и где живет доменная логика",
      "может ли healthcheck отработать даже при проблемах соседних сервисов",
      "есть ли тесты на ошибки валидации и негативные сценарии",
    ],
  },
  {
    id: "sqlalchemy-orm",
    category: "Python",
    title: "SQLAlchemy ORM",
    readTime: "15 min",
    updated: "rev 2026.04",
    summary: "Рабочая документация по моделям, сессиям, транзакциям и тому, как не утонуть в ORM-повадках.",
    tags: ["sqlalchemy", "orm", "transactions", "python"],
    overview: [
      "SQLAlchemy полезен, когда нужна ясная модель данных в коде, но при этом хочется сохранить контроль над SQL и транзакциями. Он хорошо работает, пока команда понимает, что ORM не отменяет реальную стоимость запросов.",
      "Хороший стиль в SQLAlchemy — это короткие транзакции, явные связи и аккуратная работа с eager loading. Плохой стиль — это доверить ORM магии все до последнего запроса и удивляться N+1.",
    ],
    keyPoints: [
      "Session — граница unit of work, а не глобальный объект на все приложение",
      "relationship должен описывать модель, но не скрывать стоимость доступа",
      "joinedload и selectinload решают разные проблемы чтения",
      "flush и commit — не одно и то же",
      "миграции и модельный код должны эволюционировать согласованно",
    ],
    workflowIntro: [
      "Обычно поток такой: открыть сессию → собрать запрос → получить сущности → изменить состояние → commit/rollback → закрыть сессию.",
    ],
    workflow: [
      "для чтения критичных списков заранее решай стратегию eager loading",
      "обновления оборачивай в короткие транзакции",
      "не таскай ORM-сущности в дальние слои без явной причины",
      "если нужен сложный отчет, не бойся писать более явный SQL или core-запрос",
    ],
    pitfalls: [
      "N+1 появляется там, где отношения читаются лениво в цикле",
      "длинная живая сессия держит лишнее состояние и ломает предсказуемость",
      "неявные autocommit-ожидания приводят к потере данных",
      "ORM-слой не спасает от отсутствия индексов и плохих планов",
    ],
    referenceIntro: [
      "Этот пример показывает короткую сессию, join с фильтрацией и сохранение результата в одной транзакции.",
    ],
    example: `with Session(engine) as session:
    user = session.get(User, user_id)
    if user is None:
        raise ValueError("user not found")

    orders = (
        session.query(Order)
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .limit(20)
        .all()
    )

    user.last_seen_at = datetime.utcnow()
    session.commit()`,
    checklist: [
      "есть ли у каждого критичного запроса понятный SQL-профиль",
      "управляешь ли ты временем жизни Session явно",
      "есть ли стратегия eager loading для списков и API-ответов",
      "не скрывает ли ORM от тебя настоящую стоимость JOIN и сортировок",
    ],
  },
  {
    id: "linear-algebra-manual",
    category: "Mathematics",
    title: "Linear Algebra Manual",
    readTime: "15 min",
    updated: "rev 2026.04",
    summary: "Не шпаргалка на три формулы, а нормальный конспект по векторам, матрицам, рангу, SVD и геометрическому смыслу.",
    tags: ["linear-algebra", "matrix", "svd", "eigen"],
    overview: [
      "Линейную алгебру полезно читать как язык преобразований. Матрица — это не просто таблица чисел, а объект, который двигает пространство: растягивает, поворачивает, сплющивает или меняет базис.",
      "Почти все прикладные темы — от регрессии до эмбеддингов — упираются в понимание ранга, ортогональности, разложений и устойчивости решения линейных систем.",
    ],
    keyPoints: [
      "базис задает систему координат и язык измерения",
      "ранг показывает число независимых направлений",
      "ортогональность облегчает вычисления и интерпретацию",
      "собственные значения описывают устойчивые режимы преобразования",
      "SVD полезен для сжатия, анализа структуры и устойчивого решения задач",
    ],
    workflowIntro: [
      "Когда встречаешь матрицу в прикладной задаче, сначала выясни, что именно она делает с вектором, и только потом переходи к формулам.",
    ],
    workflow: [
      "для систем уравнений оцени, квадратна ли матрица и каков ее ранг",
      "для анализа данных смотри на спектр и долю энергии в сингулярных значениях",
      "для оптимизации решай, нужна ли тебе ортогональная база или регуляризация",
      "в численных вычислениях всегда думай об устойчивости и обусловленности",
    ],
    pitfalls: [
      "путать линейную независимость и ортогональность",
      "думать, что determinant сам по себе дает практический ответ на любую задачу",
      "игнорировать масштаб признаков и обусловленность матрицы",
      "использовать инверсию там, где нужна псевдообратная или разложение",
    ],
    referenceIntro: [
      "Эта минимальная формульная опора покрывает проекцию, SVD и решение least squares.",
    ],
    example: `A x ≈ b

least squares:
x* = argmin ||Ax - b||²

normal equations:
Aᵀ A x = Aᵀ b

SVD:
A = U Σ Vᵀ

pseudoinverse:
A⁺ = V Σ⁺ Uᵀ`,
    checklist: [
      "можешь ли ты геометрически объяснить, что делает матрица",
      "понимаешь ли, зачем в прикладных задачах нужен SVD",
      "знаешь ли, почему прямое обращение матрицы часто плохая идея",
      "можешь ли отличить вырожденность от плохой обусловленности",
    ],
  },
  {
    id: "calculus-handbook",
    category: "Mathematics",
    title: "Calculus Handbook",
    readTime: "14 min",
    updated: "rev 2026.04",
    summary: "Пределы, производные, интегралы, градиенты и локальная геометрия функции без сухой схемы на полстраницы.",
    tags: ["calculus", "derivatives", "integrals", "analysis"],
    overview: [
      "Математический анализ нужен не ради набора правил, а ради языка изменений. Производная говорит, как меняется функция локально, интеграл — как величина накапливается по области, а градиент показывает направление самого быстрого роста.",
      "Если читать анализ геометрически, он становится инструментом для оптимизации, физики, статистики и машинного обучения, а не набором отдельных трюков.",
    ],
    keyPoints: [
      "предел формализует приближение и непрерывность",
      "производная — это локальный коэффициент изменения",
      "градиент и гессиан описывают поведение многомерной функции рядом с точкой",
      "определенный интеграл удобно трактовать как накопление массы, площади или вероятности",
      "ряд Тейлора дает локальную аппроксимацию и оценку ошибки",
    ],
    workflowIntro: [
      "В прикладной задаче почти всегда полезно сначала понять смысл величин, а уже потом решать, нужна производная, интеграл, замена переменных или разложение.",
    ],
    workflow: [
      "для экстремума сначала смотри на градиент, потом на вторые производные",
      "для вероятностей и плотностей аккуратно отделяй функцию распределения от density",
      "для численного интегрирования оцени область и гладкость функции",
      "для сложных композиций всегда раскладывай задачу через chain rule",
    ],
    pitfalls: [
      "слепое применение формул без проверки области определения",
      "забывать про знак и геометрический смысл производной",
      "считать интеграл только как площадь, игнорируя контекст накопления",
      "использовать локальную линейную аппроксимацию слишком далеко от точки",
    ],
    referenceIntro: [
      "Минимальный набор формул для повседневного применения в аналитике и ML.",
    ],
    example: `d/dx (x^n) = n x^(n-1)
d/dx sin(x) = cos(x)
∫ x^n dx = x^(n+1)/(n+1) + C

gradient:
∇f(x) = [∂f/∂x1, ..., ∂f/∂xn]

second-order local model:
f(x + h) ≈ f(x) + ∇f(x)·h + 1/2 hᵀ H h`,
    checklist: [
      "можешь ли ты словами объяснить смысл производной в своей задаче",
      "понимаешь ли, что означает знак и величина градиента",
      "умеешь ли выбрать между аналитическим и численным интегрированием",
      "есть ли у тебя геометрическая проверка результата, а не только алгебра",
    ],
  },
  {
    id: "probability-primer",
    category: "Mathematics",
    title: "Probability Primer",
    readTime: "15 min",
    updated: "rev 2026.04",
    summary: "Условные вероятности, ожидание, дисперсия, байесовский пересчет и логика моделирования неопределенности.",
    tags: ["probability", "bayes", "distributions", "expectation"],
    overview: [
      "Вероятность полезно понимать как модель неопределенности относительно наблюдений и гипотез. Тогда почти все формулы перестают быть магией и становятся следствием того, как мы описываем события и информацию.",
      "В реальных задачах вероятность часто нужна не сама по себе, а как язык для принятия решений: от A/B-тестов до систем скоринга и ранжирования.",
    ],
    keyPoints: [
      "условная вероятность меняет пространство рассмотрения после наблюдения",
      "ожидание — не обязательно то, что встречается часто, а средняя величина в долгой серии",
      "дисперсия и стандартное отклонение важны для риска и разброса",
      "байесовский подход удобен там, где нужно обновлять уверенность после новых данных",
      "распределение выбирают по смыслу генерации данных, а не по привычке",
    ],
    workflowIntro: [
      "При моделировании случайности сначала реши, что является исходом, что считается событием и какая информация появляется по ходу процесса.",
    ],
    workflow: [
      "определи пространство исходов и условия наблюдения",
      "отдели prior assumptions от реально пришедших данных",
      "для дискретных задач сначала попробуй явную таблицу вероятностей",
      "для непрерывных задач проверь, что density и cumulative distribution не перепутаны",
    ],
    pitfalls: [
      "путать P(A|B) и P(B|A)",
      "читать ожидание как наиболее вероятное значение",
      "выбирать распределение из привычки, не проверяя генеративную логику",
      "забывать, что данные могли быть собраны с селекцией или цензурированием",
    ],
    referenceIntro: [
      "Это минимальный каркас для повседневной работы с вероятностями.",
    ],
    example: `Bayes rule:
P(A | B) = P(B | A) P(A) / P(B)

Expectation:
E[X] = Σ x P(X = x)

Variance:
Var(X) = E[(X - E[X])²]

Law of total probability:
P(B) = Σ P(B | A_i) P(A_i)`,
    checklist: [
      "можешь ли ты назвать событие и источник наблюдения",
      "понятен ли смысл prior и posterior, если ты используешь Bayes",
      "умеешь ли интерпретировать ожидание и дисперсию в доменной задаче",
      "отделены ли вероятности модели от качества данных",
    ],
  },
  {
    id: "statistics-sheets",
    category: "Mathematics",
    title: "Statistics Sheets",
    readTime: "17 min",
    updated: "rev 2026.04",
    summary: "Оценивание, доверительные интервалы, гипотезы, регрессия и то, как не ломать выводы на данных.",
    tags: ["statistics", "inference", "regression", "sampling"],
    overview: [
      "Статистика нужна, когда по конечной выборке нужно сказать что-то о большей совокупности или о будущем процессе. Здесь важен не только расчет метрики, но и понимание, как собирались данные и какие предпосылки у модели.",
      "Самый частый провал — считать, что p-value автоматически отвечает на бизнес-вопрос. На деле сначала нужно сформулировать гипотезу, дизайн выборки и критерий принятия решения.",
    ],
    keyPoints: [
      "выборочная оценка шумная и зависит от дизайна данных",
      "confidence interval важен не меньше точечной оценки",
      "hypothesis test — это процедура сравнения модели мира с наблюдением",
      "регрессия требует проверки остатков и структуры ошибки",
      "sampling bias способен испортить даже очень точные расчеты",
    ],
    workflowIntro: [
      "Работа со статистикой обычно идет так: постановка вопроса → дизайн сбора данных → оценка → интервал/тест → интерпретация с учетом допущений.",
    ],
    workflow: [
      "проверь независимость наблюдений или явное нарушение этого предположения",
      "отдельно оцени размер эффекта и его неопределенность",
      "для регрессии всегда смотри на остатки и сегменты, а не только на R²",
      "при множественных проверках думай о ложных срабатываниях заранее",
    ],
    pitfalls: [
      "делать выводы без понимания дизайна выборки",
      "читать p-value как вероятность истинности гипотезы",
      "игнорировать размер эффекта при статистической значимости",
      "смешивать корреляцию и причинность",
    ],
    referenceIntro: [
      "Минимальная формульная опора для статистической практики.",
    ],
    example: `confidence interval:
estimate ± z * standard_error

simple linear regression:
y = β0 + β1 x + ε

standardized residual:
r_i = e_i / (s * sqrt(1 - h_i))`,
    checklist: [
      "ясно ли, как именно собраны данные",
      "есть ли интервал неопределенности, а не только точечная оценка",
      "проверены ли ключевые допущения модели",
      "интерпретируешь ли ты выводы в терминах задачи, а не только статистического ритуала",
    ],
  },
  {
    id: "graph-algorithms",
    category: "Algorithms",
    title: "Graph Algorithms",
    readTime: "16 min",
    updated: "rev 2026.04",
    summary: "Рабочая документация по BFS, DFS, shortest path, topo sort, MST и структуре графовых задач.",
    tags: ["graphs", "bfs", "dfs", "dijkstra"],
    overview: [
      "Задачи на графы редко решаются одной техникой. Сначала надо понять, что именно считается вершиной и ребром, ориентирован ли граф, есть ли веса и можно ли пользоваться структурой типа DAG.",
      "Если правильно классифицировать граф, большая часть алгоритма уже фактически выбрана: BFS для невзвешенных расстояний, Dijkstra для неотрицательных весов, topo order для DAG и так далее.",
    ],
    keyPoints: [
      "BFS дает кратчайшие пути в невзвешенном графе",
      "DFS полезен для компонент, циклов, временных меток и топологических идей",
      "Dijkstra предполагает неотрицательные веса",
      "Union-Find решает оффлайн-связность и помогает в MST-задачах",
      "структура adjacency list почти всегда практичнее матрицы смежности на больших графах",
    ],
    workflowIntro: [
      "Перед написанием кода сначала реши, что именно ты должен вернуть: расстояние, порядок, компоненту, путь или множество ребер.",
    ],
    workflow: [
      "собери корректное представление графа и проверь размерность входа",
      "определи, нужен ли directed или undirected режим",
      "выдели источник ошибки: неправильный visited, неправильный relax или неверный порядок обхода",
      "для восстановления пути отдельно храни parent или prev",
    ],
    pitfalls: [
      "использовать BFS там, где на ребрах есть веса",
      "забывать обнулить visited между разными проходами",
      "ломать Dijkstra из-за повторных записей в приоритетную очередь",
      "считать, что топологическая сортировка существует для графа с циклом",
    ],
    referenceIntro: [
      "Опорный BFS-каркас для невзвешенного графа.",
    ],
    example: `from collections import deque

def bfs(graph, start):
    dist = {start: 0}
    parent = {start: None}
    queue = deque([start])

    while queue:
        node = queue.popleft()
        for nxt in graph[node]:
            if nxt in dist:
                continue
            dist[nxt] = dist[node] + 1
            parent[nxt] = node
            queue.append(nxt)

    return dist, parent`,
    checklist: [
      "понятно ли, взвешенный граф или нет",
      "хватает ли adjacency list вместо более тяжелого представления",
      "разделены ли логика обхода и логика восстановления ответа",
      "есть ли маленький тест, на котором правильный путь известен вручную",
    ],
  },
  {
    id: "dynamic-programming-atlas",
    category: "Algorithms",
    title: "Dynamic Programming Atlas",
    readTime: "15 min",
    updated: "rev 2026.04",
    summary: "Состояния, переходы, memoization и способ проектировать DP без шаманства.",
    tags: ["dynamic-programming", "states", "transitions", "optimization"],
    overview: [
      "DP — это способ разложить задачу на перекрывающиеся подзадачи, каждая из которых описывается небольшим состоянием. Все начинается не с формулы, а с вопроса: что именно нужно помнить о прошлом, чтобы принять следующий шаг.",
      "Хороший DP сначала объясняется словами, потом таблицей состояний, и только потом кодом. Если не можешь описать переход человеческим языком, формула почти наверняка еще не готова.",
    ],
    keyPoints: [
      "состояние должно быть минимальным, но достаточным",
      "transition обязан быть локальным и однозначным",
      "top-down и bottom-up — это две формы одного рассуждения",
      "оптимизация памяти допустима только после полной корректности",
      "часто полезно сначала написать рекурсивную версию с memoization",
    ],
    workflowIntro: [
      "Рабочий порядок: описать состояние → выписать переход → определить базовые случаи → решить, как восстанавливать ответ.",
    ],
    workflow: [
      "запиши, что означает dp[i] или dp[i][j] словами",
      "проверь, не пропущены ли недостижимые состояния",
      "реши, нужен ли порядок обхода по индексам, маскам или топологическому порядку",
      "если нужен сам ответ, храни parent или choice рядом с DP-таблицей",
    ],
    pitfalls: [
      "переносить формулу из похожей задачи без переосмысления состояния",
      "смешивать значение и достижимость в одной ячейке без явного признака",
      "оптимизировать память слишком рано и ломать восстановление ответа",
      "использовать DP там, где хватает жадного алгоритма или графа",
    ],
    referenceIntro: [
      "Минимальный bottom-up пример для задачи с одним измерением состояния.",
    ],
    example: `def ways_to_climb(n):
    if n <= 1:
        return 1

    dp = [0] * (n + 1)
    dp[0] = 1
    dp[1] = 1

    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]

    return dp[n]`,
    checklist: [
      "можешь ли ты сформулировать состояние без формул",
      "есть ли строгий набор базовых случаев",
      "понятен ли порядок обхода таблицы",
      "сможешь ли ты восстановить путь или решение, а не только значение оптимума",
    ],
  },
  {
    id: "tree-structures",
    category: "Algorithms",
    title: "Tree Structures",
    readTime: "14 min",
    updated: "rev 2026.04",
    summary: "Деревья, heaps, Fenwick, segment tree и когда каждая структура действительно нужна.",
    tags: ["trees", "fenwick", "segment-tree", "heap"],
    overview: [
      "Деревья в алгоритмах нужны не потому, что это красивая абстракция, а потому, что они позволяют хранить и обновлять частичную структуру данных эффективнее, чем плоский массив.",
      "Прикладной смысл у разных деревьев разный: heap решает выбор следующего лучшего кандидата, Fenwick и segment tree ускоряют префиксные и интервальные операции, BST и trie решают поисковые задачи.",
    ],
    keyPoints: [
      "heap полезен для top-k и приоритетных задач",
      "Fenwick tree хорош для префиксных сумм и точечных обновлений",
      "segment tree нужен, когда нужны диапазоны и более сложные агрегаты",
      "balanced BST дает порядок, вставки и удаления без линейной цены",
      "выбор структуры зависит от того, что у тебя чаще: query или update",
    ],
    workflowIntro: [
      "Перед выбором структуры сформулируй операцию над данными: диапазон, точка, минимум, сумма, максимум, порядок.",
    ],
    workflow: [
      "определи тип запроса и тип обновления",
      "оцените размер данных и допустимую память",
      "проверь, можно ли заменить сложную структуру префиксными суммами",
      "при отладке сначала проверь на маленьком массиве, где ответ известен вручную",
    ],
    pitfalls: [
      "строить segment tree там, где хватает простого prefix sum",
      "путать 0-based и 1-based индексацию в Fenwick",
      "не контролировать lazy propagation, когда нужен range update",
      "забывать, что heap не хранит отсортированный массив целиком",
    ],
    referenceIntro: [
      "Минимальный Fenwick tree для суммы на префиксе.",
    ],
    example: `class Fenwick:
    def __init__(self, n):
        self.bit = [0] * (n + 1)

    def add(self, idx, delta):
        while idx < len(self.bit):
            self.bit[idx] += delta
            idx += idx & -idx

    def prefix_sum(self, idx):
        total = 0
        while idx > 0:
            total += self.bit[idx]
            idx -= idx & -idx
        return total`,
    checklist: [
      "ясен ли тип операции: точка или диапазон",
      "понимаешь ли ты асимптотику запросов и обновлений",
      "нет ли здесь более простой структуры данных",
      "есть ли ручной тест для проверки индексации",
    ],
  },
  {
    id: "string-processing",
    category: "Algorithms",
    title: "String Processing",
    readTime: "14 min",
    updated: "rev 2026.04",
    summary: "KMP, z-function, rolling hash, trie и опорные приемы для строковых задач.",
    tags: ["strings", "kmp", "z-function", "hashing"],
    overview: [
      "Строковые задачи становятся проще, если видеть в строке не набор символов, а структуру префиксов, повторов и быстрых проверок совпадения.",
      "Большая часть алгоритмов для строк отвечает на один из трех вопросов: где встречается подстрока, как быстро сравнить фрагменты и как хранить множество слов или шаблонов.",
    ],
    keyPoints: [
      "prefix function и KMP полезны для поиска и повторов",
      "z-function часто дает более прямое решение для задач на префиксы",
      "rolling hash позволяет быстро сравнивать подстроки вероятностно",
      "trie удобен для словарей и префиксных запросов",
      "suffix structures нужны только там, где реальная задача их оправдывает",
    ],
    workflowIntro: [
      "Сначала реши, нужна точная детерминированная проверка или допустим вероятностный hashing.",
    ],
    workflow: [
      "для одного шаблона и одной строки подумай о KMP или z-function",
      "для множества слов посмотри на trie или автомат",
      "для сравнения большого числа подстрок оцени rolling hash",
      "на примерах с повторяющимися префиксами проверяй алгоритм вручную",
    ],
    pitfalls: [
      "путать prefix function и z-function, не понимая их инвариантов",
      "полагаться на один hash без оценки коллизий в критичной задаче",
      "перегружать решение suffix array, когда нужен лишь поиск подстроки",
      "ломать индексы при переходе между 0-based и 1-based логикой",
    ],
    referenceIntro: [
      "Короткий эталон для вычисления prefix function.",
    ],
    example: `def prefix_function(s):
    pi = [0] * len(s)
    for i in range(1, len(s)):
        j = pi[i - 1]
        while j > 0 and s[i] != s[j]:
            j = pi[j - 1]
        if s[i] == s[j]:
            j += 1
        pi[i] = j
    return pi`,
    checklist: [
      "понятно ли, нужен поиск одного шаблона или многих",
      "можешь ли объяснить инвариант своего строкового алгоритма",
      "нет ли у тебя скрытых ошибок на повторяющихся префиксах",
      "есть ли набор коротких строк для ручной проверки результата",
    ],
  },
  {
    id: "pytorch-training",
    category: "Data & ML",
    title: "PyTorch Training",
    readTime: "17 min",
    updated: "rev 2026.04",
    summary: "Нормальная документация по train loop, autograd, dataloaders, device placement и диагностике обучения.",
    tags: ["pytorch", "training", "autograd", "deep-learning"],
    overview: [
      "PyTorch лучше всего воспринимать как язык тензоров с автоматическим дифференцированием. Сама по себе библиотека ничего не гарантирует: устойчивое обучение появляется только тогда, когда ты контролируешь данные, режимы модели, оптимизатор и измерения качества.",
      "Самая частая проблема — не отсутствие сложной архитектуры, а незамеченные детали цикла обучения: неправильный device, забытый zero_grad, train/eval режим, нестабильная нормализация и плохой сбор метрик.",
    ],
    keyPoints: [
      "Tensor, Module и Optimizer — три базовых опоры",
      "autograd строит граф вычислений динамически",
      "train() и eval() меняют поведение dropout и batchnorm",
      "DataLoader определяет throughput и воспроизводимость эксперимента",
      "логирование loss недостаточно без метрик качества и диагностики градиентов",
    ],
    workflowIntro: [
      "Нормальный training pipeline: dataset → dataloader → model → loss → backward → optimizer.step → validation loop → checkpointing.",
    ],
    workflow: [
      "явно переноси model и batch на один device",
      "перед backward всегда делай optimizer.zero_grad()",
      "для валидации переключай модель в eval и отключай градиенты",
      "сохраняй не только веса, но и конфиг эксперимента, seed и метрики",
    ],
    pitfalls: [
      "смешивать train и eval режим в одном цикле",
      "забывать нормализовать входы одинаково на train и inference",
      "считать, что loss убывает, значит модель уже хорошая",
      "терять воспроизводимость из-за случайных seed и неполных чекпоинтов",
    ],
    referenceIntro: [
      "Минимальный train step без магии.",
    ],
    example: `for features, targets in train_loader:
    features = features.to(device)
    targets = targets.to(device)

    optimizer.zero_grad()
    logits = model(features)
    loss = criterion(logits, targets)
    loss.backward()
    optimizer.step()`,
    checklist: [
      "проверен ли режим train/eval на всех этапах",
      "совпадают ли device и dtype у модели и входов",
      "есть ли отдельная validation loop и checkpoints",
      "видишь ли ты метрики кроме loss",
    ],
  },
  {
    id: "feature-engineering",
    category: "Data & ML",
    title: "Feature Engineering",
    readTime: "15 min",
    updated: "rev 2026.04",
    summary: "Подготовка признаков, борьба с утечками, оконные агрегаты и нормальный production-подход.",
    tags: ["features", "leakage", "tabular", "ml"],
    overview: [
      "Feature engineering — это не коллекция трюков, а способ сделать вход модели ближе к структуре реальной задачи. Хороший признак отражает причинную или поведенческую логику процесса, а не просто случайно коррелирует с таргетом на исторических данных.",
      "В production признаки ценны только тогда, когда их можно воспроизвести на inference с тем же смыслом и теми же ограничениями по времени и доступным данным.",
    ],
    keyPoints: [
      "временной порядок данных важнее красивой статистики",
      "агрегаты по окнам дают сигнал, если окно соотносится с поведением пользователя или системы",
      "категориальные признаки требуют стратегии для редких значений и неизвестных категорий",
      "масштабирование и нормализация должны быть воспроизводимы",
      "сложные признаки лучше собирать в явном пайплайне, а не в разрозненных ноутбуках",
    ],
    workflowIntro: [
      "Сначала выясни, какие данные доступны в момент принятия решения. Только после этого строй агрегаты, лаги и преобразования.",
    ],
    workflow: [
      "временные признаки строй так, чтобы не подмешивать будущее",
      "стабилизируй категориальные коды и схему колонок",
      "документируй каждый признак: источник, лаг, окно, смысл и ограничения",
      "сохраняй fit-параметры трансформеров отдельно от кода модели",
    ],
    pitfalls: [
      "утечка таргета через агрегации на всей выборке",
      "другой порядок колонок на inference по сравнению с train",
      "таргет-энкодинг без out-of-fold расчетов",
      "создание признаков, которых физически не будет в момент предсказания",
    ],
    referenceIntro: [
      "Ниже пример окна по пользователю с временной сортировкой и лагами.",
    ],
    example: `df = df.sort_values(["user_id", "event_time"])

df["amount_lag_1"] = df.groupby("user_id")["amount"].shift(1)
df["amount_7d_mean"] = (
    df.groupby("user_id")["amount"]
    .transform(lambda s: s.rolling(7, min_periods=2).mean())
)
df["weekday"] = df["event_time"].dt.weekday`,
    checklist: [
      "доступен ли этот признак в момент inference",
      "можно ли воспроизвести расчет без ноутбука",
      "нет ли скрытой утечки через агрегацию по будущему",
      "понятен ли доменный смысл каждого важного признака",
    ],
  },
  {
    id: "model-diagnostics",
    category: "Data & ML",
    title: "Model Diagnostics",
    readTime: "16 min",
    updated: "rev 2026.04",
    summary: "Bias-variance, calibration, сегменты ошибок, residual analysis и проверка модели до выкладки.",
    tags: ["diagnostics", "metrics", "calibration", "residuals"],
    overview: [
      "Диагностика модели начинается там, где заканчивается одна итоговая метрика. ROC-AUC, RMSE или accuracy полезны, но почти никогда не объясняют, где именно модель ломается и в каком сценарии ее поведение опасно для продукта.",
      "Хороший разбор смотрит на ошибки по сегментам, на калибровку, на стабильность по времени и на то, что происходит с предсказаниями при сдвигах входных данных.",
    ],
    keyPoints: [
      "общая метрика не заменяет разбиение по сегментам",
      "калибровка особенно важна, если вероятности участвуют в принятии решений",
      "остатки в регрессии показывают систематические перекосы",
      "дрейф данных и дрейф качества модели — не одно и то же",
      "baseline сравнение нужно даже для сильной модели",
    ],
    workflowIntro: [
      "После обучения смотри не только на leader-board, а на характер ошибок и устойчивость качества в разных условиях.",
    ],
    workflow: [
      "разбей результаты по периодам, странам, классам или типам пользователей",
      "построй calibration curve, если используешь вероятности",
      "для регрессии смотри на распределение residual и тяжелые хвосты",
      "сравни модель с простым baseline на тех же сегментах",
    ],
    pitfalls: [
      "делать вывод по одной aggregated метрике",
      "считать вероятности интерпретируемыми без проверки калибровки",
      "игнорировать сегменты с малой долей, но высокой ценой ошибки",
      "не проверять свежие периоды данных перед выкладкой",
    ],
    referenceIntro: [
      "Простейший чеклист сегментной диагностики.",
    ],
    example: `segments = ["country", "device_type", "signup_month"]
for segment in segments:
    summary = (
        df.groupby(segment, as_index=False)
        .agg(metric=("abs_error", "mean"), samples=("target", "size"))
        .sort_values("metric", ascending=False)
    )
    print(segment)
    print(summary.head())`,
    checklist: [
      "есть ли диагностика по времени и по сегментам",
      "сравнивается ли модель с baseline",
      "проверены ли calibration или residual plots",
      "понятны ли самые дорогие сценарии ошибки",
    ],
  },
  {
    id: "time-series-toolkit",
    category: "Data & ML",
    title: "Time-Series Toolkit",
    readTime: "15 min",
    updated: "rev 2026.04",
    summary: "Лаги, сезонность, window features, walk-forward evaluation и базовая дисциплина прогнозирования.",
    tags: ["time-series", "forecasting", "lags", "seasonality"],
    overview: [
      "Временные ряды требуют другой дисциплины, чем табличные задачи. Здесь ошибка в split или признаках сразу ломает весь эксперимент, потому что модель очень легко подглядит в будущее.",
      "Даже простой прогноз может быть полезным, если честно устроены лаги, сезонные признаки, walk-forward проверка и baseline вроде naive forecast или moving average.",
    ],
    keyPoints: [
      "chronological split обязателен",
      "lags и rolling features должны использовать только прошлое",
      "seasonality может жить на разных периодах: день, неделя, месяц, год",
      "baseline для временных рядов обязателен, иначе сложно понять реальную ценность модели",
      "ошибку полезно считать по горизонту прогноза, а не только одной цифрой",
    ],
    workflowIntro: [
      "Почти всегда сначала стоит построить baseline, потом добавить лаги и сезонность, и только потом усложнять модель.",
    ],
    workflow: [
      "подготовь лаги и rolling statistics только из прошлых значений",
      "используй walk-forward или backtesting вместо случайного split",
      "следи за сдвигом таргета относительно признаков",
      "отдельно измеряй качество на разных горизонтах прогноза",
    ],
    pitfalls: [
      "случайный shuffle train/test для временных данных",
      "утечка через центрированные rolling windows",
      "сравнение модели без baseline",
      "игнорирование календарных и бизнес-сезонных эффектов",
    ],
    referenceIntro: [
      "Опорный шаблон для лагов и простого rolling mean.",
    ],
    example: `df = df.sort_values("date")
df["target_lag_1"] = df["target"].shift(1)
df["target_lag_7"] = df["target"].shift(7)
df["target_roll_7"] = df["target"].shift(1).rolling(7).mean()
df["weekday"] = df["date"].dt.weekday`,
    checklist: [
      "есть ли честный временной split",
      "сравнивается ли модель с наивным baseline",
      "не попадает ли будущее в признаки даже косвенно",
      "оценено ли качество на разных горизонтах",
    ],
  },
  {
    id: "docker-handbook",
    category: "Infrastructure",
    title: "Docker Handbook",
    readTime: "14 min",
    updated: "rev 2026.04",
    summary: "Образы, слои, multi-stage builds, volumes, сети и то, как из Docker сделать рабочий, а не игрушечный deploy.",
    tags: ["docker", "containers", "build", "deploy"],
    overview: [
      "Docker полезен, когда тебе нужна воспроизводимая упаковка сервиса и одинаковое окружение между разработкой, CI и запуском. Он не заменяет архитектуру приложения, но отлично дисциплинирует входы, зависимости и runtime.",
      "Главная идея — строить маленькие, предсказуемые образы и запускать контейнеры как одноразовые, легко перезапускаемые процессы с внешней конфигурацией.",
    ],
    keyPoints: [
      "image — это артефакт сборки, container — конкретный запуск",
      "multi-stage build уменьшает размер runtime-образа",
      "volumes нужны для данных, а не для маскировки плохой сборки",
      "entrypoint и healthcheck должны отражать реальное состояние сервиса",
      "секреты не должны попадать в финальный image",
    ],
    workflowIntro: [
      "Нормальный workflow: собрать образ → прогнать контейнер локально → проверить health → использовать тот же артефакт в CI и deploy.",
    ],
    workflow: [
      "копируй lockfiles до кода, чтобы использовать layer cache",
      "отделяй build-stage от runtime-stage",
      "держи минимальный набор пакетов в финальном образе",
      "отдельно продумай, где живут логи, конфиги и persistent данные",
    ],
    pitfalls: [
      "таскать dev-зависимости и компиляторы в production image",
      "монтировать весь проект в контейнер и считать это deploy",
      "вшивать секреты и .env в Dockerfile",
      "не проверять, что контейнер реально жив и готов принимать трафик",
    ],
    referenceIntro: [
      "Минимальный multi-stage build для фронтенда или статического SPA.",
    ],
    example: `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html`,
    checklist: [
      "мал ли итоговый runtime-образ",
      "есть ли healthcheck и понятный entrypoint",
      "секреты вынесены из image",
      "совпадает ли локальный и боевой артефакт",
    ],
  },
  {
    id: "linux-operations",
    category: "Infrastructure",
    title: "Linux Operations",
    readTime: "15 min",
    updated: "rev 2026.04",
    summary: "Права, процессы, systemd, логи, порты, диски и нормальный базовый runbook для хоста.",
    tags: ["linux", "systemd", "logs", "ops"],
    overview: [
      "Linux-операции почти всегда сводятся к одинаковой диагностике: кто слушает порт, где лежат логи, хватает ли памяти, жив ли сервис и кто владеет файлами. Чем быстрее эти вещи проверяются, тем меньше мистики в эксплуатации.",
      "Хороший серверный runbook — это не огромная wiki, а короткий набор команд, которые воспроизводимо отвечают на главные вопросы о состоянии хоста.",
    ],
    keyPoints: [
      "systemd — центр управления сервисами на большинстве современных дистрибутивов",
      "journalctl дает историю событий сервиса и системы",
      "ss и lsof помогают быстро понять, кто слушает сокет или держит файл",
      "права доступа нужно читать через user, group и mode",
      "мониторинг диска и памяти нужен до того, как приложение начнет падать",
    ],
    workflowIntro: [
      "При инциденте сначала собери факты о сервисе и ресурсах, а потом уже меняй конфигурацию.",
    ],
    workflow: [
      "проверь status сервиса и последние строки лога",
      "убедись, что порт действительно слушается нужным процессом",
      "посмотри свободную память, диск и лимиты открытых файлов",
      "если меняешь unit, фиксируй и перезагружай только нужный сервис, а не всю машину",
    ],
    pitfalls: [
      "править конфиг без понимания текущего состояния процесса",
      "сразу перезапускать сервис, не сохранив симптомы",
      "забывать про ownership и chmod после деплоя",
      "не различать crash loop приложения и проблемы сети или DNS",
    ],
    referenceIntro: [
      "Опорный набор команд для первой диагностики.",
    ],
    example: `sudo systemctl status my-app
sudo journalctl -u my-app -n 100 --no-pager
sudo ss -ltnp
df -h
free -m`,
    checklist: [
      "понятно ли, жив ли сам сервис",
      "собраны ли логи до перезапуска",
      "проверены ли порт, память, диск и права",
      "можешь ли ты повторить диагностику по шагам без импровизации",
    ],
  },
  {
    id: "postgresql-basics",
    category: "Infrastructure",
    title: "PostgreSQL Basics",
    readTime: "17 min",
    updated: "rev 2026.04",
    summary: "JOIN, индексы, транзакции, планы запросов и реальные паттерны ускорения PostgreSQL.",
    tags: ["postgresql", "sql", "indexes", "transactions"],
    overview: [
      "PostgreSQL — это система, в которой производительность часто определяется не одним магическим параметром, а сочетанием запроса, индексов, кардинальности и плана выполнения.",
      "Чтобы ускорять базу осмысленно, нужно уметь читать EXPLAIN, понимать цену сортировок и join-стратегий, а также отделять проблему SQL от проблемы схемы и индексов.",
    ],
    keyPoints: [
      "индекс помогает только тогда, когда соответствует шаблону запроса",
      "transaction isolation влияет на согласованность и конкурентный доступ",
      "EXPLAIN ANALYZE показывает реальное выполнение, а не пожелания",
      "autovacuum критичен для живых таблиц с обновлениями и удалениями",
      "connection pooling нужен задолго до очень больших нагрузок",
    ],
    workflowIntro: [
      "Сначала сформулируй симптом: долгое чтение, долгий update, lock contention или рост bloat. От симптома зависит стратегия.",
    ],
    workflow: [
      "сними EXPLAIN ANALYZE и проверь, где реально тратится время",
      "оцени селективность фильтров и порядок условий",
      "смотри, помогает ли partial или composite index под конкретный запрос",
      "для долгих транзакций проверь locks и конкуренцию за строки",
    ],
    pitfalls: [
      "создавать индексы без понимания реальных запросов",
      "читать planner cost как абсолютное время без ANALYZE",
      "игнорировать autovacuum и статистику таблиц",
      "пытаться лечить ORM-нагрузку только параметрами БД",
    ],
    referenceIntro: [
      "Базовый шаблон для анализа агрегирующего запроса.",
    ],
    example: `EXPLAIN ANALYZE
SELECT user_id, sum(amount) AS revenue
FROM orders
WHERE created_at >= current_date - interval '30 days'
GROUP BY user_id
ORDER BY revenue DESC
LIMIT 20;`,
    checklist: [
      "есть ли у тебя реальный план выполнения",
      "совпадает ли индекс с шаблоном чтения",
      "понятно ли, есть ли проблема в locks или в кардинальности",
      "проверены ли вакуум и статистика по таблице",
    ],
  },
  {
    id: "redis-guide",
    category: "Infrastructure",
    title: "Redis Guide",
    readTime: "14 min",
    updated: "rev 2026.04",
    summary: "TTL, кеши, очереди, pub/sub, streams и трезвый взгляд на Redis в проде.",
    tags: ["redis", "cache", "streams", "pubsub"],
    overview: [
      "Redis отлично подходит для быстрых чтений, TTL-кэшей, счетчиков и простых очередей, но он становится опасным, когда его начинают использовать как неявную базу данных без явной стратегии надежности и инвалидирования.",
      "Самый полезный подход — четко определить роль Redis в системе: кэш, ephemeral state, coordination primitive или event buffer.",
    ],
    keyPoints: [
      "TTL помогает ограничить устаревание кэша, но не решает invalidation полностью",
      "pub/sub удобен для сигналов, а не для надежной доставки",
      "streams дают более управляемую модель событий, чем обычные списки",
      "горячие ключи и тяжелые значения быстро создают bottleneck",
      "нужно понимать, что именно произойдет при рестарте или failover",
    ],
    workflowIntro: [
      "Сначала выбери сценарий: cache, lock, queue, pub/sub или stream. Для каждого сценария — свой паттерн и свои риски.",
    ],
    workflow: [
      "для кэша определи ключ, TTL и стратегию инвалидирования",
      "для счетчиков реши, нужен ли persistence и атомарность",
      "для событий выбери между pub/sub и stream по требованиям доставки",
      "для локов заранее реши стратегию истечения и восстановления",
    ],
    pitfalls: [
      "считать pub/sub надежной очередью доставки",
      "игнорировать размер и горячесть ключей",
      "хранить важные данные только в Redis без понимания durability",
      "думать, что TTL автоматически решает проблему устаревших кэшей",
    ],
    referenceIntro: [
      "Минимальный набор команд для кеша и stream-события.",
    ],
    example: `SET product:42 '{"title":"Keyboard","price":79}' EX 300
GET product:42
INCR page:view:home
XADD events * type signup user_id 18`,
    checklist: [
      "ясна ли роль Redis в архитектуре",
      "определен ли lifecycle данных и TTL",
      "понятно ли поведение при рестарте и потере узла",
      "нет ли здесь более подходящего durable storage",
    ],
  },
  {
    id: "git-workflows",
    category: "Workflow",
    title: "Git Workflows",
    readTime: "13 min",
    updated: "rev 2026.04",
    summary: "Ветки, rebase, hotfix, release flow и понятный командный ритм без грязной истории.",
    tags: ["git", "rebase", "release", "workflow"],
    overview: [
      "Git-процесс нужен не ради церемонии, а ради предсказуемой интеграции. Хорошая история должна объяснять, что изменилось и почему, а не только хранить сырой поток локальных сохранений.",
      "Чем меньше ветка, тем меньше когнитивная и техническая цена конфликта. Длинные ветки почти всегда дороже, чем кажется.",
    ],
    keyPoints: [
      "feature branches полезны, пока они короткие и целостные по смыслу",
      "rebase хорош для уборки своей ветки, но опасен на общей истории",
      "release tags гораздо полезнее памяти о дате выкладки",
      "hotfix должен быстро вернуться в main, иначе возникает расслоение кода",
      "merge policy должна быть понятной и одинаковой для команды",
    ],
    workflowIntro: [
      "Обычно достаточно простого flow: короткая feature branch → PR → review → merge → tag/release при необходимости.",
    ],
    workflow: [
      "перед пушем подтяни main и реши конфликты локально",
      "не смешивай в одной ветке рефакторинг и новую фичу без крайней нужды",
      "используй понятные commit messages, а не случайные savepoints",
      "для релизов фиксируй tag и changelog в одном месте",
    ],
    pitfalls: [
      "rebase общей ветки после того, как ее уже забрали другие",
      "гигантские PR со множеством несвязанных изменений",
      "hotfix только в production-ветке без обратного мержa в main",
      "история, из которой непонятно, что именно было развернуто",
    ],
    referenceIntro: [
      "Минимальный flow для короткой feature-ветки.",
    ],
    example: `git checkout -b feature/docs-portal
git fetch origin
git rebase origin/main
git push -u origin feature/docs-portal`,
    checklist: [
      "ветка короткая и решает одну задачу",
      "merge policy понятна всей команде",
      "релизы помечаются tag-ами",
      "горячие фиксы возвращаются в основную ветку",
    ],
  },
  {
    id: "ci-cd-playbook",
    category: "Workflow",
    title: "CI/CD Playbook",
    readTime: "15 min",
    updated: "rev 2026.04",
    summary: "Пайплайны, артефакты, секреты, окружения и выкладки без ручного шаманства.",
    tags: ["ci-cd", "pipelines", "deploy", "automation"],
    overview: [
      "CI/CD нужен не чтобы нажимать красивую кнопку деплоя, а чтобы уменьшать цену изменений. Хороший пайплайн автоматически проверяет код, собирает артефакт и выкладывает одинаковым способом каждый раз.",
      "Важнее всего предсказуемость: один и тот же commit должен давать один и тот же build, а окружения должны отличаться конфигом, а не случайными ручными правками.",
    ],
    keyPoints: [
      "pipeline делится на verify, build, release и deploy-этапы",
      "секреты должны храниться отдельно от кода и артефакта",
      "артефакт должен быть immutable после сборки",
      "rollback надо проектировать заранее, а не во время инцидента",
      "постдеплойная проверка не менее важна, чем pre-merge тесты",
    ],
    workflowIntro: [
      "Нормальный flow: push → tests/lint → build artifact → publish → deploy → smoke tests → observe.",
    ],
    workflow: [
      "разделяй проверку качества и сборку артефакта",
      "старайся использовать один и тот же артефакт на staging и production",
      "после деплоя запускай короткий smoke test",
      "логируй, какой commit и кто именно был развернут",
    ],
    pitfalls: [
      "ручные изменения на сервере, которые не отражены в repo",
      "сборка заново на production вместо использования готового артефакта",
      "секреты в .env внутри репозитория",
      "деплой без post-check и возможности быстрого rollback",
    ],
    referenceIntro: [
      "Простейший пайплайн шагов как опорная схема.",
    ],
    example: `verify:
  - lint
  - unit-tests

build:
  - docker build
  - publish artifact

deploy:
  - deploy to staging
  - smoke test
  - deploy to production`,
    checklist: [
      "артефакт неизменяем и воспроизводим",
      "секреты вынесены из репозитория",
      "есть smoke test после выкладки",
      "rollback выполняется предсказуемо",
    ],
  },
  {
    id: "observability-primer",
    category: "Workflow",
    title: "Observability Primer",
    readTime: "14 min",
    updated: "rev 2026.04",
    summary: "Метрики, логи, трассировки, health/readiness и нормальный набор сигналов по сервису.",
    tags: ["observability", "metrics", "logs", "tracing"],
    overview: [
      "Наблюдаемость — это не набор красивых дашбордов, а способность быстро понять, что именно сломалось, где, у кого и почему. Если система не отвечает на эти вопросы, то мониторинг декоративен.",
      "В хорошем стеке разные сигналы дополняют друг друга: метрики показывают масштаб, логи дают локальный контекст, трейсы раскрывают путь запроса через цепочку сервисов.",
    ],
    keyPoints: [
      "metrics хороши для трендов, SLO и алертов",
      "structured logs нужны для локальной диагностики и корреляции событий",
      "traces помогают в распределенных системах и сложных пользовательских сценариях",
      "health и readiness — разные сигналы с разной целью",
      "обсервабилити должно быть встроено в сервис, а не навешено постфактум",
    ],
    workflowIntro: [
      "При проектировании сервиса сначала определи, что будет считаться здоровым состоянием, и какие сигналы должны рассказать об отклонении.",
    ],
    workflow: [
      "собери request rate, error rate и latency по ключевым endpoint",
      "в логах пробрасывай request id и контекст пользователя или задания",
      "для фоновых задач измеряй queue lag и retry depth",
      "строй алерты по симптомам деградации, а не по каждому исключению",
    ],
    pitfalls: [
      "метрики без контекста и labels, по которым нельзя разрезать проблему",
      "логи без request id и бизнес-контекста",
      "алерты на шум, а не на реальную деградацию сервиса",
      "healthcheck, который сам тяжелее полезной работы сервиса",
    ],
    referenceIntro: [
      "Короткий минимальный набор, который почти всегда нужен веб-сервису.",
    ],
    example: `service_requests_total
service_request_duration_seconds
service_errors_total
background_jobs_in_queue
background_job_failures_total`,
    checklist: [
      "есть ли у сервиса золотые сигналы",
      "можно ли связать лог, метрику и trace одного запроса",
      "алерты ведут к действию, а не к шуму",
      "health и readiness разделены по смыслу",
    ],
  },
  {
    id: "incident-response-notes",
    category: "Workflow",
    title: "Incident Response Notes",
    readTime: "14 min",
    updated: "rev 2026.04",
    summary: "Runbook по инцидентам: сбор симптомов, коммуникация, гипотезы, rollback и постмортем.",
    tags: ["incident-response", "runbook", "rollback", "postmortem"],
    overview: [
      "Во время инцидента важнее всего не героизм, а порядок: кто ведет таймлайн, кто копает техническую причину, кто держит коммуникацию и какие изменения разрешено делать.",
      "Большая часть вреда в инциденте появляется не от первичной ошибки, а от хаотичных действий без фиксации состояния и без понимания последствий.",
    ],
    keyPoints: [
      "сначала зафиксируй симптомы и масштаб, потом меняй систему",
      "роли по инциденту должны быть явными хотя бы минимально",
      "rollback часто ценнее, чем долгий live-debug в проде",
      "каждое действие лучше записывать во временную линию",
      "после инцидента нужен не поиск виноватого, а устранение системной причины",
    ],
    workflowIntro: [
      "Базовый шаблон: detect → assess → stabilize → investigate → recover → review.",
    ],
    workflow: [
      "оценить масштаб: кто затронут, какие пути сломаны, с какого времени",
      "собрать логи, метрики и конфигурацию до рестартов и правок",
      "принять решение: rollback, feature flag off, rate limit, degrade mode",
      "после стабилизации зафиксировать таймлайн и подготовить postmortem",
    ],
    pitfalls: [
      "массовые перезапуски без сохранения симптомов",
      "несколько людей одновременно правят систему без координации",
      "нет явного критерия, что инцидент уже стабилизирован",
      "postmortem сводится к пересказу событий без исправления процесса",
    ],
    referenceIntro: [
      "Мини-чеклист на первые минуты инцидента.",
    ],
    example: `1. Confirm impact and affected paths
2. Freeze ad-hoc changes
3. Assign incident lead and communication owner
4. Gather logs, metrics, config diff
5. Decide on rollback or mitigation
6. Record timeline and follow-up actions`,
    checklist: [
      "есть ли явный incident lead",
      "собраны ли симптомы до изменений",
      "принята ли стратегия стабилизации",
      "запланирован ли postmortem с корректирующими действиями",
    ],
  },
  {
    id: "requests-guide",
    category: "Python",
    title: "Requests Guide",
    readTime: "13 min",
    updated: "rev 2026.04",
    summary: "Практическая документация по requests: Session, timeouts, retries, streaming и работе с API.",
    tags: ["requests", "http", "python", "api"],
    overview: [
      "Requests остается самым понятным способом делать HTTP-запросы из Python, если тебе не нужен асинхронный клиент. Главная ценность библиотеки в том, что она дает хороший баланс между простотой вызова и контролем над заголовками, cookie, таймаутами и потоковой передачей данных.",
      "В боевых задачах requests почти всегда должен использоваться через Session, а не отдельные вызовы requests.get/post в случайных местах кода. Так проще контролировать соединения, общие заголовки и повторную авторизацию.",
    ],
    keyPoints: [
      "Session переиспользует соединения и хранит общие настройки",
      "таймаут надо задавать явно почти всегда",
      "raise_for_status помогает не проглатывать ошибки API",
      "stream=True нужен для больших ответов и скачивания файлов",
      "retry лучше делать осознанно через adapter или внешний слой",
    ],
    workflowIntro: [
      "Нормальный клиент для API выглядит так: создать Session → настроить base headers → отправить запрос → проверить статус → распарсить ответ → логировать ошибки с контекстом.",
    ],
    workflow: [
      "заведи одну Session на жизненный цикл клиента",
      "передавай timeout в каждый запрос или оборачивай вызовы централизованно",
      "отделяй транспортные ошибки от бизнес-ошибок ответа",
      "для файлов и больших payload используй stream и chunked reading",
    ],
    pitfalls: [
      "делать запросы без timeout и зависать на неопределенное время",
      "слепо дергать response.json без проверки типа ответа и статуса",
      "создавать новую Session на каждый вызов",
      "не различать retry-safe и non-idempotent операции",
    ],
    referenceIntro: [
      "Опорный шаблон клиента с Session и явной обработкой ошибок.",
    ],
    example: `import requests

session = requests.Session()
session.headers.update({"Authorization": f"Bearer {token}"})

response = session.get(
    "https://api.example.com/items",
    params={"limit": 50},
    timeout=(3.05, 10),
)
response.raise_for_status()
payload = response.json()`,
    checklist: [
      "есть ли timeout на каждом запросе",
      "используется ли Session вместо разрозненных вызовов",
      "разделены ли сетевые ошибки и ошибки бизнес-контракта",
      "понятно ли, где и как делается retry",
    ],
  },
  {
    id: "pydantic-models",
    category: "Python",
    title: "Pydantic Models",
    readTime: "14 min",
    updated: "rev 2026.04",
    summary: "Модели, валидация, aliases, settings и нормальная схема работы с типизированными данными.",
    tags: ["pydantic", "validation", "schemas", "settings"],
    overview: [
      "Pydantic полезен там, где нужно четко описать форму входных данных и быстро получить валидацию на границе системы. Он особенно силен для API, конфигов, событий и обмена данными между слоями приложения.",
      "Важная дисциплина — не превращать pydantic-модель в универсальный объект для всего подряд. Хорошая схема должна отражать конкретный контракт: вход запроса, выход ответа, settings или внутреннее событие.",
    ],
    keyPoints: [
      "BaseModel задает контракт данных и преобразование типов",
      "Field позволяет описывать ограничения и метаданные",
      "aliases помогают согласовать внешние и внутренние имена полей",
      "Settings удобны для конфигурации через env",
      "валидацию лучше держать ближе к границе системы",
    ],
    workflowIntro: [
      "Обычно поток такой: определить модель → валидировать вход → работать уже с нормализованными данными → при выходе сериализовать явно.",
    ],
    workflow: [
      "разделяй input и output модели, если контракт различается",
      "используй явные типы вместо свободных dict",
      "держи env-конфиг в отдельной settings-модели",
      "не смешивай доменную логику и транспортную валидацию в одном месте",
    ],
    pitfalls: [
      "одна огромная модель на все сценарии",
      "скрытые преобразования типов без осознания последствий",
      "отсутствие distinction между nullable и optional",
      "валидация слишком поздно, уже после того как данные разошлись по коду",
    ],
    referenceIntro: [
      "Минимальная схема входной модели и конфигурации из env.",
    ],
    example: `from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

class UserIn(BaseModel):
    email: str
    age: int = Field(ge=0, le=130)

class Settings(BaseSettings):
    app_env: str = "dev"
    database_url: str`,
    checklist: [
      "есть ли отдельные модели под разные контракты",
      "описаны ли ограничения полей явно",
      "понятно ли, где идет сериализация и где валидация",
      "вынесены ли settings в отдельную модель",
    ],
  },
  {
    id: "asyncio-guide",
    category: "Python",
    title: "AsyncIO Guide",
    readTime: "15 min",
    updated: "rev 2026.04",
    summary: "Tasks, gather, queues, cancellation и здоровый способ строить асинхронные пайплайны.",
    tags: ["asyncio", "python", "tasks", "queues"],
    overview: [
      "AsyncIO нужен не для ускорения любого Python-кода, а для сценариев с большим количеством конкурентных I/O-операций. Он особенно полезен для сетевых клиентов, воркеров, API-шлюзов и пайплайнов, где много ожидания, но не так много CPU.",
      "Главная ошибка в async-коде — думать, что async автоматически делает программу быстрее. На деле важнее правильно управлять задачами, ограничивать параллелизм и корректно обрабатывать отмену.",
    ],
    keyPoints: [
      "Task — это отдельная конкурентная единица исполнения",
      "await передает управление event loop, а не создает поток",
      "Queue помогает строить producer-consumer пайплайны",
      "cancellation нужно проектировать явно",
      "timeout и backpressure часто важнее самого concurrency",
    ],
    workflowIntro: [
      "Обычно асинхронный пайплайн строится так: producer создает задания → queue буферизует → workers обрабатывают → ошибки и отмена собираются централизованно.",
    ],
    workflow: [
      "ограничивай количество одновременных задач semaphore или bounded queue",
      "для долгоживущих задач обрабатывай CancelledError корректно",
      "не блокируй event loop синхронными CPU-heavy вызовами",
      "логируй таймауты и retriable ошибки отдельно от фатальных",
    ],
    pitfalls: [
      "создавать слишком много задач без ограничения параллелизма",
      "забывать await на корутине",
      "делать блокирующий I/O внутри async-функций",
      "игнорировать корректное завершение воркеров и очередей",
    ],
    referenceIntro: [
      "Минимальный пример очереди и пула воркеров.",
    ],
    example: `import asyncio

async def worker(queue):
    while True:
        item = await queue.get()
        try:
            await process(item)
        finally:
            queue.task_done()

async def main():
    queue = asyncio.Queue()
    workers = [asyncio.create_task(worker(queue)) for _ in range(4)]`,
    checklist: [
      "есть ли контроль параллелизма",
      "обрабатывается ли отмена задач",
      "нет ли блокирующего кода внутри event loop",
      "понятно ли, где очередь наполняется и где опустошается",
    ],
  },
  {
    id: "docker-compose-notes",
    category: "Infrastructure",
    title: "Docker Compose Notes",
    readTime: "13 min",
    updated: "rev 2026.04",
    summary: "Compose под локальную разработку и простые сервисные наборы: сети, volumes, env и зависимости.",
    tags: ["docker-compose", "containers", "services", "local-dev"],
    overview: [
      "Docker Compose удобен там, где нужно поднять несколько связанных сервисов одной командой: приложение, база, redis, воркер, nginx и так далее. Для локальной разработки это почти всегда быстрее и чище, чем ручной запуск каждого компонента.",
      "Хороший compose-файл описывает не только контейнеры, но и связи между ними: сети, тома, переменные окружения, healthcheck и предсказуемые имена сервисов.",
    ],
    keyPoints: [
      "services описывают каждый контейнерный процесс",
      "volumes нужны для данных и удобной локальной разработки",
      "depends_on помогает задать порядок старта, но не заменяет readiness",
      "env_file и environment задают конфигурацию запуска",
      "общая сеть дает сервисам доступ друг к другу по именам",
    ],
    workflowIntro: [
      "Типичный локальный сценарий: app + db + cache + worker, где compose управляет их совместным стартом и остановкой.",
    ],
    workflow: [
      "держи compose для dev простым и читабельным",
      "healthcheck используй там, где от этого зависит следующий сервис",
      "для базы вынеси данные в volume",
      "не подменяй production-оркестрацию локальным compose-файлом без адаптации",
    ],
    pitfalls: [
      "надеяться, что depends_on гарантирует готовность сервиса",
      "сваливать и dev, и prod конфиг в один трудно читаемый файл",
      "держать секреты прямо в compose.yaml",
      "монтировать весь корень проекта без понимания, что именно нужно контейнеру",
    ],
    referenceIntro: [
      "Базовый compose-сценарий для app, postgres и redis.",
    ],
    example: `services:
  app:
    build: .
    ports: ["8000:8000"]
    depends_on: [db, redis]

  db:
    image: postgres:16
    volumes: ["pgdata:/var/lib/postgresql/data"]

  redis:
    image: redis:7

volumes:
  pgdata:`,
    checklist: [
      "разделены ли dev и prod настройки",
      "используются ли volumes там, где нужны данные",
      "есть ли healthcheck для зависимых сервисов",
      "понятно ли, как сервисы видят друг друга по именам",
    ],
  },
  {
    id: "caddy-nginx-reverse-proxy",
    category: "Infrastructure",
    title: "Caddy and Nginx Reverse Proxy",
    readTime: "16 min",
    updated: "rev 2026.04",
    summary: "Reverse proxy, HTTPS, заголовки, websocket upgrades и выбор между Caddy и Nginx.",
    tags: ["caddy", "nginx", "reverse-proxy", "https"],
    overview: [
      "Reverse proxy нужен, чтобы принять внешний трафик, раздать HTTPS, отдать статику, прокинуть запросы в приложение и централизованно управлять заголовками и маршрутами. Для небольших проектов чаще всего выбор идет между Caddy и Nginx.",
      "Caddy выигрывает простотой автоматического HTTPS и конфигурации. Nginx сильнее как давно устоявшийся гибкий инструмент с огромным количеством готовых рецептов.",
    ],
    keyPoints: [
      "reverse proxy отделяет внешний HTTP-слой от приложения",
      "TLS и сертификаты лучше жить на proxy, а не внутри app",
      "для websocket важны корректные upgrade-заголовки",
      "headers и caching rules должны быть осознанными, а не скопированными вслепую",
      "статические файлы часто лучше раздавать самим proxy",
    ],
    workflowIntro: [
      "Для простого сайта схема обычно такая: client → Caddy/Nginx → app на localhost. Внутри proxy описываются host, маршруты, заголовки и TLS.",
    ],
    workflow: [
      "реши, где будет termination TLS",
      "раздели статику и проксируемые запросы по локациям или роутам",
      "для websocket или SSE проверь поведение заголовков и таймаутов",
      "добавь healthcheck или отдельный endpoint для диагностики",
    ],
    pitfalls: [
      "забыть прокинуть upgrade для websocket",
      "смешивать пользовательский IP с IP прокси без X-Forwarded-* логики",
      "кешировать динамический контент по ошибке",
      "хранить слишком много бизнес-логики прямо в конфиге прокси",
    ],
    referenceIntro: [
      "Минимальный пример для Caddy и Nginx.",
    ],
    example: `# Caddy
example.com {
  reverse_proxy localhost:8000
}

# Nginx
server {
  listen 80;
  server_name example.com;
  location / {
    proxy_pass http://127.0.0.1:8000;
  }
}`,
    checklist: [
      "определено ли, где живет TLS",
      "корректно ли настроены заголовки проксирования",
      "проверен ли websocket/sse сценарий при наличии",
      "ясно ли, что отдается как статика, а что идет в app",
    ],
  },
  {
    id: "linux-shell-cheatsheet",
    category: "Workflow",
    title: "Linux Shell Cheatsheet",
    readTime: "12 min",
    updated: "rev 2026.04",
    summary: "Быстрые команды для файлов, процессов, прав, сети и диагностики прямо с терминала сервера.",
    tags: ["linux", "shell", "ssh", "commands"],
    overview: [
      "Когда заходишь на сервер по SSH, большая часть практики — это не писать сложные скрипты, а быстро и уверенно пользоваться десятком базовых команд. Эти команды должны помогать тебе понять состояние системы, найти нужные файлы и поправить конфиг без паники.",
      "Хорошая shell-дисциплина — это короткие, проверяемые команды и привычка сначала смотреть, а потом менять.",
    ],
    keyPoints: [
      "pwd, ls, cd — базовая навигация по файловой системе",
      "cat, less, tail, grep/rg — чтение и поиск в файлах",
      "ps, top, htop, ss — процессы и сетевые сокеты",
      "chmod, chown, stat — права и владельцы",
      "curl — быстрый способ проверить локальный HTTP endpoint",
    ],
    workflowIntro: [
      "Для типичной серверной диагностики обычно хватает: найти директорию → посмотреть конфиг → проверить процесс → проверить порт → проверить локальный HTTP.",
    ],
    workflow: [
      "перед удалением или изменением сначала сделай ls -la и pwd",
      "для логов удобен tail -f или journalctl",
      "для сетевых проверок смотри curl localhost и ss -ltnp",
      "используй rg вместо grep там, где нужен быстрый поиск по проекту",
    ],
    pitfalls: [
      "запускать destructive команды не проверив текущую директорию",
      "править права наугад через chmod -R 777",
      "не различать root-owned и user-owned файлы",
      "делать вывод о проблеме без локальной проверки curl/port",
    ],
    referenceIntro: [
      "Минимальный набор команд для каждого SSH-сеанса на сервере.",
    ],
    example: `pwd
ls -la
tail -n 50 storage/messages.json
ss -ltnp
curl http://127.0.0.1:8000/api/health`,
    checklist: [
      "проверил ли ты текущую директорию",
      "понятны ли владельцы и права файлов",
      "есть ли локальная проверка приложения через curl",
      "видно ли, какой процесс слушает нужный порт",
    ],
  },
];

DOC_LIBRARY = DOC_CONFIGS.map((config, index) => ({
  ...buildDoc(config),
  number: index + 1,
}));
initTheme();

if (
  docSearchNode &&
  docListNode &&
  categoryFilterNode &&
  docTotalCountNode &&
  visibleDocCountNode &&
  categoryCountNode &&
  readerCategoryNode &&
  readerLengthNode &&
  readerUpdatedNode &&
  readerTitleNode &&
  readerSummaryNode &&
  readerContentNode &&
  readerNode
) {
  initDocsLibrary();
}
