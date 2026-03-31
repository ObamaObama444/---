<?php declare(strict_types=1); ?>
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
    <link rel="stylesheet" href="/assets/styles.css" />
  </head>
  <body>
    <button
      id="chat-toggle"
      class="chat-toggle"
      type="button"
      aria-label="Открыть панель обсуждений"
      title="Открыть панель обсуждений"
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
            <span id="doc-total-count">15 docs</span>
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
            <span id="visible-doc-count">15 visible</span>
            <span>openable readable documentation pages</span>
          </div>
        </div>
      </header>

      <main class="library-layout">
        <aside class="catalog" aria-label="Каталог документации">
          <div class="catalog__head">
            <p class="eyebrow">Catalog</p>
            <span id="category-count">05 collections</span>
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

    <aside id="chat-panel" class="chat-panel" aria-hidden="true">
      <div class="chat-panel__header">
        <div>
          <p class="chat-panel__eyebrow">Discussion</p>
          <h2>Общий чат</h2>
        </div>
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

    <script src="/assets/docs.js" defer></script>
    <script src="/assets/app.js" defer></script>
  </body>
</html>
