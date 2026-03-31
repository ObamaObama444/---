<?php declare(strict_types=1); ?>
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reference Index</title>
    <meta
      name="description"
      content="Сводный индекс инженерных документаций, математических конспектов, API-заметок и эксплуатационных справочников."
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

    <div class="site-frame">
      <header class="site-head">
        <p class="site-kicker">Reference Index / Internal Library</p>
        <div class="site-head__row">
          <h1>Сборник документаций, конспектов и технических заметок</h1>
          <div class="site-meta">
            <span>312 documents</span>
            <span>python / math / infra / ml / api</span>
          </div>
        </div>
        <p class="site-intro">
          Локальный индекс по прикладному Python, математике, алгоритмам,
          инфраструктуре, DevOps, базам данных и моделированию. Здесь собраны
          короткие инженерные справочники, заметки по библиотекам и учебные
          подборки для быстрого входа в задачу.
        </p>
        <div class="search-line" aria-hidden="true">
          <span>search</span>
          <code>numpy / fastapi / интегралы / графы / postgresql / docker / pytorch</code>
        </div>
      </header>

      <main class="docs-stream">
        <section class="docs-section">
          <div class="section-head">
            <p>Python Libraries</p>
            <span>08 entries</span>
          </div>
          <div class="doc-list">
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>NumPy Reference</h2>
                <p>arrays, dtype, indexing, broadcasting, vectorization, memory layout, reshape rules</p>
              </div>
              <span class="doc-row__meta">array / numeric</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Pandas Cookbook</h2>
                <p>merge, groupby, window functions, missing data, time series, pivot, reshaping</p>
              </div>
              <span class="doc-row__meta">dataframe / etl</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>FastAPI Notes</h2>
                <p>routing, async endpoints, pydantic schemas, dependencies, validation and middleware</p>
              </div>
              <span class="doc-row__meta">api / backend</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Requests and HTTP</h2>
                <p>sessions, retries, streaming, headers, cookies, timeouts and error handling</p>
              </div>
              <span class="doc-row__meta">client / http</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>SQLAlchemy ORM</h2>
                <p>models, sessions, transactions, eager loading, migrations and query composition</p>
              </div>
              <span class="doc-row__meta">orm / sql</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Pydantic Models</h2>
                <p>type validation, aliases, settings, computed fields, nested models and schema output</p>
              </div>
              <span class="doc-row__meta">schema / validation</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Matplotlib Quick Notes</h2>
                <p>figures, axes, subplots, legends, styles, annotations and export presets</p>
              </div>
              <span class="doc-row__meta">plot / viz</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>AsyncIO Guide</h2>
                <p>tasks, gather, queues, cancellation, deadlines and producer-consumer pipelines</p>
              </div>
              <span class="doc-row__meta">async / runtime</span>
            </article>
          </div>
        </section>

        <section class="docs-section">
          <div class="section-head">
            <p>Mathematics</p>
            <span>08 entries</span>
          </div>
          <div class="doc-list">
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Linear Algebra Manual</h2>
                <p>vectors, basis, rank, determinant, eigendecomposition, diagonalization and SVD</p>
              </div>
              <span class="doc-row__meta">matrix / decomposition</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Calculus Handbook</h2>
                <p>limits, derivatives, integrals, gradients, taylor series and multivariable basics</p>
              </div>
              <span class="doc-row__meta">analysis / calc</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Probability Primer</h2>
                <p>events, conditional probability, Bayes rule, distributions, expectation and variance</p>
              </div>
              <span class="doc-row__meta">probability / stats</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Statistics Sheets</h2>
                <p>estimation, confidence intervals, regression, p-values, hypothesis tests and sampling</p>
              </div>
              <span class="doc-row__meta">inference / data</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Discrete Math Deck</h2>
                <p>logic, sets, combinatorics, recurrences, induction and proof patterns</p>
              </div>
              <span class="doc-row__meta">discrete / logic</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Graph Theory Notes</h2>
                <p>trees, flows, paths, connectivity, DAGs, cut properties and matching basics</p>
              </div>
              <span class="doc-row__meta">graphs / combinatorics</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Optimization Basics</h2>
                <p>convexity, gradients, constraints, lagrange multipliers and descent methods</p>
              </div>
              <span class="doc-row__meta">optimization / ml</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Number Theory Pages</h2>
                <p>modular arithmetic, primes, gcd, euclid, congruences and cryptography preliminaries</p>
              </div>
              <span class="doc-row__meta">algebra / crypto</span>
            </article>
          </div>
        </section>

        <section class="docs-section">
          <div class="section-head">
            <p>Algorithms & Computer Science</p>
            <span>08 entries</span>
          </div>
          <div class="doc-list">
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Complexity Cheatsheet</h2>
                <p>big O, amortized cost, lower bounds, memory trade-offs and practical profiling</p>
              </div>
              <span class="doc-row__meta">complexity / runtime</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Dynamic Programming Atlas</h2>
                <p>state modeling, memoization, iterative transitions and optimization patterns</p>
              </div>
              <span class="doc-row__meta">dp / patterns</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Tree Structures</h2>
                <p>bst, heaps, fenwick trees, segment trees, traversals and balanced updates</p>
              </div>
              <span class="doc-row__meta">trees / structures</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Graph Algorithms</h2>
                <p>bfs, dfs, dijkstra, topo sort, mst, scc and shortest path variants</p>
              </div>
              <span class="doc-row__meta">graphs / traversal</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>String Processing</h2>
                <p>kmp, z-function, rolling hash, tries, suffix arrays and prefix automata</p>
              </div>
              <span class="doc-row__meta">strings / search</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>System Design Capsules</h2>
                <p>caches, queues, rate limits, fan-out, consistency and service boundaries</p>
              </div>
              <span class="doc-row__meta">architecture / scale</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Concurrency Patterns</h2>
                <p>locks, semaphores, channels, workers, retries, idempotency and event flow</p>
              </div>
              <span class="doc-row__meta">concurrency / backend</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Testing Strategies</h2>
                <p>unit, integration, property tests, fixtures, mocks and observability hooks</p>
              </div>
              <span class="doc-row__meta">quality / testing</span>
            </article>
          </div>
        </section>

        <section class="docs-section">
          <div class="section-head">
            <p>Data & Machine Learning</p>
            <span>06 entries</span>
          </div>
          <div class="doc-list">
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>scikit-learn Guide</h2>
                <p>pipelines, preprocessing, cross-validation, metrics and model selection</p>
              </div>
              <span class="doc-row__meta">ml / baseline</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>PyTorch Notes</h2>
                <p>tensors, autograd, modules, dataloaders, optimizers and training loops</p>
              </div>
              <span class="doc-row__meta">deep learning / training</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Feature Engineering</h2>
                <p>encoding, scaling, leakage control, window features and target transforms</p>
              </div>
              <span class="doc-row__meta">features / prep</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Model Diagnostics</h2>
                <p>bias variance, calibration, residual analysis, roc auc and confusion matrices</p>
              </div>
              <span class="doc-row__meta">evaluation / diagnosis</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Time-Series Toolkit</h2>
                <p>lags, seasonality, decomposition, stationarity and rolling evaluation</p>
              </div>
              <span class="doc-row__meta">forecast / sequence</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Data Quality Playbook</h2>
                <p>null checks, schema validation, drift monitoring, thresholds and alerts</p>
              </div>
              <span class="doc-row__meta">quality / monitoring</span>
            </article>
          </div>
        </section>

        <section class="docs-section">
          <div class="section-head">
            <p>Infrastructure</p>
            <span>08 entries</span>
          </div>
          <div class="doc-list">
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Docker Handbook</h2>
                <p>images, layers, compose, volumes, networking and production build practices</p>
              </div>
              <span class="doc-row__meta">containers / deploy</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Linux Server Notes</h2>
                <p>permissions, processes, packages, journald, cron, ssh and firewall basics</p>
              </div>
              <span class="doc-row__meta">linux / ops</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Git Workflows</h2>
                <p>branching, rebase, cherry-pick, releases, recovery patterns and conflict handling</p>
              </div>
              <span class="doc-row__meta">git / collaboration</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>PostgreSQL Basics</h2>
                <p>joins, transactions, indexes, query plans, vacuum and pooling</p>
              </div>
              <span class="doc-row__meta">database / sql</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Redis Short Guide</h2>
                <p>ttl, cache invalidation, pubsub, streams, locks and session storage</p>
              </div>
              <span class="doc-row__meta">cache / queue</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Caddy and Nginx</h2>
                <p>reverse proxy, tls, websocket upgrades, static caching and route matching</p>
              </div>
              <span class="doc-row__meta">proxy / https</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>CI/CD Notes</h2>
                <p>pipelines, artifacts, secrets, deploy stages, rollbacks and verification</p>
              </div>
              <span class="doc-row__meta">delivery / automation</span>
            </article>
            <article class="doc-row">
              <div class="doc-row__copy">
                <h2>Observability Primer</h2>
                <p>metrics, logs, traces, health checks, dashboards and alert routing</p>
              </div>
              <span class="doc-row__meta">monitoring / telemetry</span>
            </article>
          </div>
        </section>

        <section class="route-notes">
          <div class="route-notes__head">
            <p>Reading routes</p>
            <span>02 paths</span>
          </div>
          <div class="route-list">
            <div class="route-row">
              <h2>Практический backend-маршрут</h2>
              <p>python runtime → fastapi → sqlalchemy → postgresql → docker → reverse proxy → observability</p>
            </div>
            <div class="route-row">
              <h2>Маршрут для математики и ML</h2>
              <p>linear algebra → probability → statistics → optimization → features → models → diagnostics</p>
            </div>
          </div>
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

    <script src="/assets/app.js" type="module"></script>
  </body>
</html>
