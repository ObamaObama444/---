<?php
declare(strict_types=1);

$stylesVersion = (string) @filemtime(__DIR__ . "/assets/styles.css");
$docsVersion = (string) @filemtime(__DIR__ . "/assets/docs.js");
$appVersion = (string) @filemtime(__DIR__ . "/assets/app.js");
?>
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reference Library</title>
    <meta
      name="description"
      content="Минималистичный сборник инженерной документации, учебных конспектов и прикладных справочников."
    />
    <script>
      try {
        const savedTheme = localStorage.getItem("reference-theme-v1");
        if (savedTheme === "dark") {
          document.documentElement.dataset.theme = "dark";
        }
      } catch (_error) {}
    </script>
    <link rel="stylesheet" href="/assets/styles.css?v=<?= htmlspecialchars($stylesVersion, ENT_QUOTES, 'UTF-8') ?>" />
  </head>
  <body>
    <button
      id="chat-toggle"
      class="chat-toggle"
      type="button"
      aria-label="Открыть панель обсуждений"
      title="Открыть панель обсуждений"
    ></button>
    <button
      id="doc-forum-toggle"
      class="doc-forum-toggle"
      type="button"
      aria-label="Открыть форум модуля"
      title="Открыть форум модуля"
    ></button>

    <div class="site-shell">
      <header class="masthead">
        <p class="eyebrow">Reference Library / Internal Archive</p>
        <div class="masthead__row">
          <div class="masthead__copy">
            <h1>Сборник документации, конспектов и рабочих справочников</h1>
            <p>
              Полнотекстовые заметки по Python, математике, алгоритмам,
              инфраструктуре, данным и эксплуатации. Каждый материал можно
              открыть и читать как отдельную документацию.
            </p>
          </div>

          <div class="masthead__stats">
            <span id="doc-total-count">30 docs</span>
            <span>python / math / algorithms / ml / infra</span>
          </div>
        </div>

        <div class="toolbar">
          <label class="search-field">
            <span>search</span>
            <input
              id="doc-search"
              type="search"
              placeholder="numpy, fastapi, интегралы, redis, pytorch"
              autocomplete="off"
            />
          </label>

          <div class="toolbar__meta">
            <span id="visible-doc-count">30 visible</span>
            <span>openable readable documentation pages</span>
          </div>
        </div>
      </header>

      <main class="library-layout">
        <aside class="catalog" aria-label="Каталог документации">
          <div class="catalog__head">
            <p class="eyebrow">Catalog</p>
            <span id="category-count">06 collections</span>
          </div>

          <div id="category-filter" class="category-filter"></div>
          <div id="doc-list" class="doc-list"></div>
        </aside>

        <section class="reader" aria-live="polite">
          <div class="reader__head">
            <div class="reader__meta">
              <span id="reader-category"></span>
              <span id="reader-length"></span>
              <span id="reader-updated"></span>
            </div>
            <h2 id="reader-title"></h2>
            <p id="reader-summary"></p>
          </div>

          <article id="reader-content" class="reader-content"></article>
        </section>
      </main>
    </div>

    <div id="chat-backdrop" class="chat-backdrop" hidden></div>
    <div id="doc-forum-backdrop" class="doc-forum-backdrop" hidden></div>

    <aside id="doc-forum-panel" class="doc-forum-panel" aria-hidden="true">
      <div class="doc-forum-panel__header">
        <div>
          <p id="doc-forum-module-label" class="eyebrow"></p>
          <h2 id="doc-forum-title">Форум модуля</h2>
        </div>
        <button
          id="doc-forum-close"
          class="chat-close"
          type="button"
          aria-label="Закрыть форум"
          title="Закрыть форум"
        >
          ×
        </button>
      </div>

      <div id="doc-forum-root" class="doc-forum-panel__body"></div>
    </aside>

    <aside id="chat-panel" class="chat-panel" aria-hidden="true">
      <div class="chat-panel__header">
        <div class="chat-panel__spacer" aria-hidden="true"></div>
        <button
          id="chat-close"
          class="chat-close"
          type="button"
          aria-label="Закрыть чат"
          title="Закрыть чат"
        >
          ×
        </button>
      </div>

      <main id="chat-shell" class="chat-shell">
        <section id="messages" class="messages" aria-live="polite"></section>

        <form id="message-form" class="composer">
          <input id="file-input" type="file" name="file" multiple hidden />
          <div id="attachment-strip" class="attachment-strip" hidden></div>

          <div class="composer-topbar">
            <div class="chat-mode-picker">
              <button
                id="chat-mode-button"
                class="chat-mode-button"
                type="button"
                aria-haspopup="true"
                aria-expanded="false"
                title="Выбрать режим чата"
              >
                <span id="chat-mode-label">Общий чат</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="m6 9 6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.8"
                  />
                </svg>
              </button>

              <div id="chat-mode-menu" class="chat-mode-menu" hidden>
                <button class="chat-mode-option is-active" type="button" data-mode="room">
                  <span>Общий чат</span>
                </button>
                <button class="chat-mode-option" type="button" data-mode="ai">
                  <span>Ассистент</span>
                </button>
              </div>
            </div>
          </div>

          <div class="composer-row">
            <button
              id="attach-button"
              class="icon-button"
              type="button"
              aria-label="Прикрепить файл"
              title="Прикрепить файл"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M8.5 12.5 15 6a3.5 3.5 0 1 1 5 5l-9 9a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                />
              </svg>
            </button>

            <label class="message-box">
              <textarea
                id="message-input"
                name="message"
                maxlength="1500"
                rows="1"
                placeholder="Сообщение"
              ></textarea>
            </label>

            <button
              id="send-button"
              class="icon-button icon-button--send"
              type="submit"
              aria-label="Отправить"
              title="Отправить"
            >
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
              </svg>
            </button>
          </div>
        </form>

        <div id="drop-indicator" class="drop-indicator" hidden>Отпусти файлы</div>
      </main>
    </aside>

    <button
      id="theme-toggle"
      class="theme-toggle"
      type="button"
      aria-label="Включить темную тему"
      title="Темная тема"
    >
      <svg class="theme-toggle__sun" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8" />
        <path d="M12 2.5v2.3M12 19.2v2.3M4.8 4.8l1.6 1.6M17.6 17.6l1.6 1.6M2.5 12h2.3M19.2 12h2.3M4.8 19.2l1.6-1.6M17.6 6.4l1.6-1.6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
      </svg>
      <svg class="theme-toggle__moon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 14.6A7.5 7.5 0 0 1 9.4 5a8 8 0 1 0 9.6 9.6Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.8" />
      </svg>
    </button>

    <script src="/assets/docs.js?v=<?= htmlspecialchars($docsVersion, ENT_QUOTES, 'UTF-8') ?>" defer></script>
    <script src="/assets/app.js?v=<?= htmlspecialchars($appVersion, ENT_QUOTES, 'UTF-8') ?>" defer></script>
  </body>
</html>
