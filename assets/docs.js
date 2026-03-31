const DOC_LIBRARY = [
  {
    id: "numpy-reference",
    category: "Python",
    title: "NumPy Reference",
    readTime: "7 min",
    updated: "rev 2026.03",
    summary: "Быстрый справочник по массивам, broadcasting, индексированию и векторным операциям.",
    tags: ["arrays", "numeric", "vectorization"],
    sections: [
      {
        title: "Когда использовать",
        paragraphs: [
          "NumPy нужен там, где данные уже лежат в числовых массивах и важны плотное хранение, предсказуемые формы и быстрые операции по большим блокам памяти.",
          "Если задача сводится к циклам по числам, почти всегда стоит сначала проверить, можно ли переписать ее через векторные операции и broadcasting.",
        ],
        bullets: [
          "Используй ndarray как базовый контейнер для численной обработки.",
          "Следи за shape и dtype раньше, чем начинаешь оптимизацию.",
          "Старайся двигаться от whole-array операций, а не от Python-циклов.",
        ],
      },
      {
        title: "Ключевые приемы",
        bullets: [
          "broadcasting позволяет не копировать данные, а логически расширять измерения",
          "reshape удобен только когда общее число элементов не меняется",
          "boolean indexing полезен для отбора, но может создавать копии",
          "axis задает направление агрегации: axis=0 по строкам вниз, axis=1 по столбцам вправо",
        ],
      },
      {
        title: "Мини-шаблон",
        code: `import numpy as np

x = np.arange(12, dtype=np.float64).reshape(3, 4)
weights = np.array([0.2, 0.3, 0.1, 0.4])

centered = x - x.mean(axis=0, keepdims=True)
score = centered @ weights
mask = score > 0

result = x[mask]
print(result)`,
      },
    ],
  },
  {
    id: "pandas-cookbook",
    category: "Python",
    title: "Pandas Cookbook",
    readTime: "8 min",
    updated: "rev 2026.03",
    summary: "Практические паттерны для таблиц: merge, groupby, временные ряды и очистка данных.",
    tags: ["dataframe", "etl", "analytics"],
    sections: [
      {
        title: "Базовый поток работы",
        paragraphs: [
          "Хороший рабочий ритм в pandas обычно выглядит так: загрузка → приведение типов → проверка пропусков → обогащение признаков → агрегация → сохранение результата.",
        ],
        bullets: [
          "Сразу нормализуй даты и категориальные поля.",
          "Не полагайся на object-столбцы там, где можно поставить category, int64 или datetime64.",
          "Перед merge проверяй уникальность ключей и размерность соединения.",
        ],
      },
      {
        title: "Частые операции",
        bullets: [
          "groupby + agg подходит для витрин и отчетов",
          "assign помогает строить линейный читаемый пайплайн",
          "merge(validate='one_to_one') страхует от тихого размножения строк",
          "pivot_table удобен для итоговых матриц и сводных таблиц",
        ],
      },
      {
        title: "Мини-шаблон",
        code: `import pandas as pd

orders = pd.read_csv("orders.csv", parse_dates=["created_at"])
users = pd.read_csv("users.csv")

report = (
    orders
    .merge(users, on="user_id", how="left", validate="many_to_one")
    .assign(month=lambda df: df["created_at"].dt.to_period("M").astype(str))
    .groupby(["month", "country"], as_index=False)
    .agg(revenue=("amount", "sum"), orders=("order_id", "nunique"))
)

print(report.head())`,
      },
    ],
  },
  {
    id: "fastapi-notes",
    category: "Python",
    title: "FastAPI Notes",
    readTime: "7 min",
    updated: "rev 2026.03",
    summary: "Маршрутизация, схемы, зависимости и структура API под production-режим.",
    tags: ["api", "backend", "async"],
    sections: [
      {
        title: "Что важно в структуре",
        paragraphs: [
          "FastAPI хорош не только быстрым стартом, но и тем, что заставляет явно описывать контракт API через модели, типы и зависимости.",
        ],
        bullets: [
          "Разделяй transport-layer схемы и доменные объекты.",
          "Зависимости используй для auth, db-session и feature flags.",
          "Ошибки отдавай как понятные HTTPException с предсказуемой схемой.",
        ],
      },
      {
        title: "Практика эксплуатации",
        bullets: [
          "для healthcheck делай отдельный легкий endpoint без тяжелых зависимостей",
          "валидацию входа держи на уровне pydantic-моделей",
          "middleware используй только для действительно поперечных задач",
          "не смешивай бизнес-логику с обработчиком маршрута",
        ],
      },
      {
        title: "Мини-шаблон",
        code: `from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class ItemIn(BaseModel):
    title: str
    price: float

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/items")
async def create_item(payload: ItemIn):
    if payload.price < 0:
        raise HTTPException(status_code=400, detail="price must be >= 0")
    return {"ok": True, "item": payload.model_dump()}`,
      },
    ],
  },
  {
    id: "linear-algebra-manual",
    category: "Mathematics",
    title: "Linear Algebra Manual",
    readTime: "9 min",
    updated: "rev 2026.03",
    summary: "Векторы, базисы, матрицы, ранги, собственные значения и смысл разложений.",
    tags: ["matrix", "svd", "eigen"],
    sections: [
      {
        title: "Каркас темы",
        paragraphs: [
          "Линейная алгебра становится понятнее, когда матрица читается не как таблица чисел, а как линейное преобразование пространства.",
        ],
        bullets: [
          "базис задает систему координат",
          "ранг показывает, сколько независимых направлений реально осталось",
          "собственные векторы подсвечивают устойчивые направления преобразования",
        ],
      },
      {
        title: "Полезные ориентиры",
        bullets: [
          "determinant описывает изменение объема и вырожденность матрицы",
          "SVD почти всегда полезнее интуитивно, чем спектральное разложение",
          "ортогональные матрицы сохраняют длины и углы",
          "псевдообратная нужна, когда система переопределена или вырождена",
        ],
      },
      {
        title: "Чеклист понимания",
        bullets: [
          "можешь ли ты объяснить геометрический смысл матричного умножения",
          "понимаешь ли разницу между линейной независимостью и ортогональностью",
          "можешь ли сказать, зачем в ML нужен SVD и PCA",
        ],
      },
    ],
  },
  {
    id: "calculus-handbook",
    category: "Mathematics",
    title: "Calculus Handbook",
    readTime: "8 min",
    updated: "rev 2026.03",
    summary: "Пределы, производные, интегралы и интуиция для многомерного анализа.",
    tags: ["analysis", "derivative", "integral"],
    sections: [
      {
        title: "На что смотреть",
        paragraphs: [
          "Производная отвечает на локальное изменение функции, а интеграл — на накопление величины. Если держать эту пару смыслов в голове, формулы перестают быть абстракцией.",
        ],
        bullets: [
          "предел нужен, чтобы аккуратно говорить о приближении",
          "градиент указывает направление самого быстрого роста",
          "якобиан и гессиан описывают локальную геометрию отображения",
        ],
      },
      {
        title: "Практические паттерны",
        bullets: [
          "chain rule нужен почти везде, где есть вложенные функции",
          "taylor expansion полезен для локальной аппроксимации и анализа ошибки",
          "определенный интеграл часто трактуется как площадь или накопленная масса",
          "в оптимизации важен не только градиент, но и масштаб координат",
        ],
      },
      {
        title: "Мини-сводка формул",
        code: `d/dx (x^n) = n * x^(n-1)
d/dx sin(x) = cos(x)
∫ x^n dx = x^(n+1)/(n+1) + C, n != -1
∇f(x) = [∂f/∂x1, ∂f/∂x2, ..., ∂f/∂xn]`,
      },
    ],
  },
  {
    id: "probability-primer",
    category: "Mathematics",
    title: "Probability Primer",
    readTime: "7 min",
    updated: "rev 2026.03",
    summary: "События, условные вероятности, ожидание, дисперсия и базовые распределения.",
    tags: ["probability", "bayes", "statistics"],
    sections: [
      {
        title: "Основные идеи",
        paragraphs: [
          "Вероятность удобно понимать как модель неопределенности, а не как магическое число. Тогда правила суммы и произведения воспринимаются как конструкция модели.",
        ],
        bullets: [
          "условная вероятность меняет пространство рассмотрения",
          "ожидание — это средняя долгосрочная величина",
          "дисперсия измеряет разброс вокруг ожидания",
        ],
      },
      {
        title: "Базовые инструменты",
        bullets: [
          "Bayes rule помогает пересчитывать уверенность после наблюдения",
          "Bernoulli и Binomial нужны для редких дискретных событий",
          "Normal distribution часто всплывает из-за central limit theorem",
          "law of large numbers объясняет стабилизацию средних",
        ],
      },
      {
        title: "Короткая формула",
        code: `P(A | B) = P(B | A) * P(A) / P(B)
E[X] = Σ x * P(X = x)
Var(X) = E[(X - E[X])^2]`,
      },
    ],
  },
  {
    id: "graph-algorithms",
    category: "Algorithms",
    title: "Graph Algorithms",
    readTime: "9 min",
    updated: "rev 2026.03",
    summary: "BFS, DFS, shortest path, topological sort, MST и типовые графовые задачи.",
    tags: ["graphs", "bfs", "dijkstra"],
    sections: [
      {
        title: "Как распознавать тип задачи",
        paragraphs: [
          "Большинство задач на графы сначала надо перевести в правильный тип графа: ориентированный или нет, взвешенный или нет, DAG или общий случай.",
        ],
        bullets: [
          "невзвешенный shortest path почти всегда означает BFS",
          "DAG подсказывает топологический порядок и динамику по нему",
          "положительные веса часто приводят к Dijkstra",
        ],
      },
      {
        title: "Рабочие приемы",
        bullets: [
          "DFS удобен для компонент связности, циклов и временных меток",
          "Union-Find полезен для оффлайн-объединений и MST",
          "при больших графах важнее структура adjacency list, чем красота абстракции",
          "внимательно контролируй visited и порядок обновления расстояний",
        ],
      },
      {
        title: "Мини-шаблон BFS",
        code: `from collections import deque

def bfs(graph, start):
    dist = {start: 0}
    queue = deque([start])

    while queue:
        node = queue.popleft()
        for nxt in graph[node]:
            if nxt in dist:
                continue
            dist[nxt] = dist[node] + 1
            queue.append(nxt)
    return dist`,
      },
    ],
  },
  {
    id: "dynamic-programming-atlas",
    category: "Algorithms",
    title: "Dynamic Programming Atlas",
    readTime: "8 min",
    updated: "rev 2026.03",
    summary: "Состояния, переходы, memoization и способ думать о DP без паники.",
    tags: ["dp", "optimization", "states"],
    sections: [
      {
        title: "Как находить DP",
        paragraphs: [
          "DP почти всегда появляется там, где есть перекрывающиеся подзадачи и решение можно описать через состояние с конечной памятью о прошлом.",
        ],
        bullets: [
          "найди, что именно нужно помнить о префиксе или подмножестве",
          "запиши переход словами, а не формулой",
          "после этого решай, нужен top-down или bottom-up",
        ],
      },
      {
        title: "Типовые формы",
        bullets: [
          "dp[i] для префикса",
          "dp[i][j] для двух измерений состояния",
          "bitmask dp для маленьких подмножеств",
          "knapsack-подобные переходы для ограниченных ресурсов",
        ],
      },
      {
        title: "Мини-шаблон",
        code: `def fib(n):
    if n <= 1:
        return n
    dp = [0, 1]
    for i in range(2, n + 1):
        dp.append(dp[i - 1] + dp[i - 2])
    return dp[n]`,
      },
    ],
  },
  {
    id: "system-design-capsules",
    category: "Algorithms",
    title: "System Design Capsules",
    readTime: "7 min",
    updated: "rev 2026.03",
    summary: "Кеши, очереди, rate limiting, fan-out и компромиссы между простотой и масштабом.",
    tags: ["system-design", "caching", "queues"],
    sections: [
      {
        title: "С чего начинать",
        paragraphs: [
          "Хороший system design начинается не с выборов технологий, а с явных ограничений: объем трафика, тип нагрузки, SLA, консистентность, допустимая задержка.",
        ],
        bullets: [
          "сначала уточни read-heavy или write-heavy нагрузку",
          "отдельно определи hot path и фоновые процессы",
          "не проектируй глобальную платформу, если решаешь локальную задачу",
        ],
      },
      {
        title: "Типовые блоки",
        bullets: [
          "cache снижает latency и давление на БД",
          "queue отцепляет медленные операции от пользовательского запроса",
          "rate limit страхует систему и соседние сервисы от всплесков",
          "idempotency нужна, когда возможны ретраи и повторные доставки",
        ],
      },
      {
        title: "Вопросы на ревью",
        bullets: [
          "что будет при двойной доставке события",
          "что будет при падении очереди или cache miss storm",
          "где проходит граница между sync и async частями",
        ],
      },
    ],
  },
  {
    id: "pytorch-notes",
    category: "Data & ML",
    title: "PyTorch Notes",
    readTime: "8 min",
    updated: "rev 2026.03",
    summary: "Тензоры, autograd, модели, dataloaders и базовый train loop.",
    tags: ["deep-learning", "autograd", "training"],
    sections: [
      {
        title: "Ментальная модель",
        paragraphs: [
          "PyTorch удобно воспринимать как библиотеку тензоров плюс систему вычислительных графов для автодифференцирования.",
        ],
        bullets: [
          "Tensor — основной контейнер данных",
          "Module — способ собрать параметры и вычисление вместе",
          "Optimizer меняет веса на основе накопленных градиентов",
        ],
      },
      {
        title: "Что важно не забыть",
        bullets: [
          "model.train() и model.eval() переключают режимы слоев",
          "optimizer.zero_grad() нужен перед backward",
          "device и dtype надо контролировать явно",
          "DataLoader дает батчи и шифл без ручного бойлерплейта",
        ],
      },
      {
        title: "Мини-шаблон",
        code: `for features, targets in train_loader:
    features = features.to(device)
    targets = targets.to(device)

    optimizer.zero_grad()
    logits = model(features)
    loss = criterion(logits, targets)
    loss.backward()
    optimizer.step()`,
      },
    ],
  },
  {
    id: "feature-engineering",
    category: "Data & ML",
    title: "Feature Engineering",
    readTime: "6 min",
    updated: "rev 2026.03",
    summary: "Подготовка признаков, кодирование категорий, контроль утечек и агрегаты по окнам.",
    tags: ["features", "prep", "leakage"],
    sections: [
      {
        title: "Главный принцип",
        paragraphs: [
          "Хороший признак отражает структуру задачи, а не просто случайно коррелирует с таргетом на обучающей выборке.",
        ],
        bullets: [
          "проверяй причинный порядок появления данных",
          "не подмешивай информацию из будущего в train-пайплайн",
          "сложные признаки лучше собирать воспроизводимо, а не руками в ноутбуке",
        ],
      },
      {
        title: "Что обычно работает",
        bullets: [
          "агрегаты по пользователю, товару, периоду",
          "циклические признаки для времени и календаря",
          "логарифмирование длинных хвостов",
          "таргет-энкодинг только с аккуратным out-of-fold расчетом",
        ],
      },
      {
        title: "Контроль качества",
        bullets: [
          "одинаковая логика transform на train и inference",
          "явная схема признаков и порядок колонок",
          "мониторинг drift после выкладки модели",
        ],
      },
    ],
  },
  {
    id: "model-diagnostics",
    category: "Data & ML",
    title: "Model Diagnostics",
    readTime: "7 min",
    updated: "rev 2026.03",
    summary: "Bias-variance, калибровка, метрики, ошибки по сегментам и анализ остатков.",
    tags: ["metrics", "evaluation", "diagnostics"],
    sections: [
      {
        title: "Как смотреть на модель",
        paragraphs: [
          "Одной метрики почти никогда не хватает. Модель стоит смотреть через общую метрику, стабильность по сегментам и характер ошибок.",
        ],
        bullets: [
          "classification требует precision/recall и понимания стоимости ошибки",
          "ranking требует метрик на уровне порядка, а не просто класса",
          "regression хорошо раскрывается через residual plots и ошибки по квантилям",
        ],
      },
      {
        title: "Сигналы проблем",
        bullets: [
          "калибровка вероятностей плохая, хотя ROC-AUC приличный",
          "модель хорошо работает только на крупных сегментах",
          "ошибка резко растет на свежих периодах данных",
          "сильная чувствительность к небольшим сдвигам признаков",
        ],
      },
      {
        title: "Чеклист перед выкладкой",
        bullets: [
          "есть offline и online метрики",
          "есть сравнение с базовой моделью",
          "понятны негативные сценарии и защитные пороги",
        ],
      },
    ],
  },
  {
    id: "docker-handbook",
    category: "Infrastructure",
    title: "Docker Handbook",
    readTime: "7 min",
    updated: "rev 2026.03",
    summary: "Образы, слои, compose, сети, тома и минимально адекватный production build.",
    tags: ["docker", "containers", "deploy"],
    sections: [
      {
        title: "На что влияет Docker",
        paragraphs: [
          "Docker дает воспроизводимую упаковку приложения, но не заменяет архитектуру и не исправляет плохую конфигурацию процесса.",
        ],
        bullets: [
          "образ должен быть минимальным и предсказуемым",
          "runtime secrets не должны зашиваться в image",
          "контейнер должен легко рестартоваться и быть stateless, где это возможно",
        ],
      },
      {
        title: "Практика сборки",
        bullets: [
          "используй multi-stage build для уменьшения итогового образа",
          "копируй lockfiles раньше application code для лучшего cache hit",
          "делай healthcheck там, где сервис реально можно проверить",
          "держи volumes только для данных, а не для скрытия проблем сборки",
        ],
      },
      {
        title: "Мини-шаблон",
        code: `FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html`,
      },
    ],
  },
  {
    id: "linux-server-notes",
    category: "Infrastructure",
    title: "Linux Server Notes",
    readTime: "8 min",
    updated: "rev 2026.03",
    summary: "Права, процессы, systemd, логи, cron, ssh и базовая эксплуатация хоста.",
    tags: ["linux", "ops", "server"],
    sections: [
      {
        title: "Базовая рутина",
        paragraphs: [
          "Большая часть администрирования Linux-сервера — это не магия, а дисциплина: права, процессы, журналы, сетевые порты и повторяемые команды диагностики.",
        ],
        bullets: [
          "понимай разницу между пользователем, группой и режимами доступа",
          "умей быстро посмотреть процессы, сокеты и доступное место",
          "веди ясные service unit и не прячь логи",
        ],
      },
      {
        title: "Что проверять первым делом",
        bullets: [
          "df -h и free -m для диска и памяти",
          "ss -ltnp для портов и слушающих процессов",
          "journalctl -u service-name для системных логов",
          "systemctl status service-name для состояния юнита",
        ],
      },
      {
        title: "Мини-команды",
        code: `sudo systemctl restart my-app
sudo journalctl -u my-app -n 100 --no-pager
sudo ss -ltnp
df -h`,
      },
    ],
  },
  {
    id: "postgresql-basics",
    category: "Infrastructure",
    title: "PostgreSQL Basics",
    readTime: "8 min",
    updated: "rev 2026.03",
    summary: "JOIN, индексы, планы запросов, транзакции и что реально ускоряет SQL.",
    tags: ["postgres", "sql", "database"],
    sections: [
      {
        title: "Как думать о PostgreSQL",
        paragraphs: [
          "PostgreSQL — это не просто хранение строк. На производительности обычно решает форма запроса, выбор индекса и размер промежуточных выборок.",
        ],
        bullets: [
          "индекс помогает только если совпадает с путями фильтрации и сортировки",
          "лишние JOIN могут быть дешевле, чем кажется, а могут взорвать план",
          "транзакции нужны не только для атомарности, но и для согласованного чтения",
        ],
      },
      {
        title: "Рабочие инструменты",
        bullets: [
          "EXPLAIN ANALYZE показывает реальное поведение плана",
          "composite index имеет смысл под конкретный порядок условий",
          "VACUUM и autovacuum критичны для живой таблицы с обновлениями",
          "пул соединений важен уже на умеренной нагрузке",
        ],
      },
      {
        title: "Мини-паттерн",
        code: `EXPLAIN ANALYZE
SELECT user_id, sum(amount) AS revenue
FROM orders
WHERE created_at >= current_date - interval '30 days'
GROUP BY user_id
ORDER BY revenue DESC
LIMIT 20;`,
      },
    ],
  },
  {
    id: "redis-short-guide",
    category: "Infrastructure",
    title: "Redis Short Guide",
    readTime: "6 min",
    updated: "rev 2026.03",
    summary: "TTL, кеширование, pub/sub, streams и где Redis полезен, а где опасен.",
    tags: ["redis", "cache", "queue"],
    sections: [
      {
        title: "Когда Redis уместен",
        paragraphs: [
          "Redis хорош как быстрый слой доступа, но не стоит превращать его в единственный источник истины без явных причин и понимания потерь.",
        ],
        bullets: [
          "кеши и TTL — самый понятный сценарий",
          "locks подходят только при ясной стратегии истечения и освобождения",
          "streams и lists помогают для простых очередей и событий",
        ],
      },
      {
        title: "Подводные камни",
        bullets: [
          "cache invalidation почти всегда сложнее, чем первая версия кеша",
          "горячие ключи создают локальные bottleneck",
          "pub/sub не гарантирует durable delivery",
          "expiring keys может неожиданно влиять на поведение продукта",
        ],
      },
      {
        title: "Мини-шаблон",
        code: `SET product:42 '{"title":"Keyboard","price":79}' EX 300
GET product:42
INCR page:view:home
XADD events * type signup user_id 18`,
      },
    ],
  },
  {
    id: "git-workflows",
    category: "Workflow",
    title: "Git Workflows",
    readTime: "6 min",
    updated: "rev 2026.03",
    summary: "Ветки, rebase, cherry-pick, hotfix и безопасная работа с общей историей.",
    tags: ["git", "branches", "collaboration"],
    sections: [
      {
        title: "Главный принцип",
        paragraphs: [
          "Git-процесс нужен не ради ритуалов, а чтобы история была понятной, а интеграция изменений происходила без сюрпризов.",
        ],
        bullets: [
          "короткоживущие ветки проще мержить и ревьюить",
          "rebase полезен для уборки своей ветки, но опасен на общей истории",
          "cherry-pick — инструмент точечного переноса, а не стандартный режим работы",
        ],
      },
      {
        title: "Практика команды",
        bullets: [
          "перед пушем полезно подтянуть main и решить конфликты локально",
          "не держи в одном PR десяток несвязанных тем",
          "hotfix должен быть минимальным и быстро возвращаться в main",
          "теги релизов полезнее, чем память о том, что и когда выкатывали",
        ],
      },
      {
        title: "Мини-команды",
        code: `git checkout -b feature/docs-reader
git fetch origin
git rebase origin/main
git push -u origin feature/docs-reader`,
      },
    ],
  },
  {
    id: "observability-primer",
    category: "Workflow",
    title: "Observability Primer",
    readTime: "7 min",
    updated: "rev 2026.03",
    summary: "Метрики, логи, трассировки, healthcheck и базовая схема алертинга.",
    tags: ["observability", "metrics", "logs"],
    sections: [
      {
        title: "Зачем это нужно",
        paragraphs: [
          "Наблюдаемость — это не красивые графики, а способность быстро понять, что именно ломается, у кого и почему.",
        ],
        bullets: [
          "метрики дают агрегированную картину",
          "логи нужны для локального контекста события",
          "трейсы помогают увидеть путь запроса через несколько сервисов",
        ],
      },
      {
        title: "Минимальный набор",
        bullets: [
          "request rate, error rate, latency по ключевым endpoint",
          "структурированные логи с request id",
          "healthcheck и readiness отдельно от бизнес-логики",
          "алерты по симптомам сервиса, а не по каждой мелочи",
        ],
      },
      {
        title: "Вопросы при инциденте",
        bullets: [
          "когда началась деградация",
          "все ли пользователи затронуты или только сегмент",
          "что изменилось перед инцидентом",
        ],
      },
    ],
  },
];

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
  readerContentNode
) {
  initDocsLibrary();
}

function initDocsLibrary() {
  const state = {
    query: "",
    category: "All",
    activeDocId: "",
  };

  const categories = ["All", ...new Set(DOC_LIBRARY.map((doc) => doc.category))];
  docTotalCountNode.textContent = `${DOC_LIBRARY.length} docs`;
  categoryCountNode.textContent = `${String(categories.length - 1).padStart(2, "0")} collections`;

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

  renderCategoryFilter(categories, state, () => syncVisibleState());

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
      openDoc(findDocById(docId));
      renderDocList(filteredDocs, state, handleSelect);
    };

    renderDocList(filteredDocs, state, handleSelect);

    openDoc(findDocById(state.activeDocId), { updateHash: false });
  }

  function openDoc(doc, options = {}) {
    if (!doc) {
      renderEmptyReader();
      return;
    }

    const { updateHash = true } = options;
    readerCategoryNode.textContent = doc.category;
    readerLengthNode.textContent = doc.readTime;
    readerUpdatedNode.textContent = doc.updated;
    readerTitleNode.textContent = doc.title;
    readerSummaryNode.textContent = doc.summary;

    readerContentNode.textContent = "";
    readerContentNode.append(renderTagRow(doc.tags));

    doc.sections.forEach((section) => {
      readerContentNode.append(renderDocSection(section));
    });

    if (updateHash) {
      window.history.replaceState(null, "", `#${doc.id}`);
    }
  }
}

function filterDocs(state) {
  return DOC_LIBRARY.filter((doc) => {
    const matchesCategory = state.category === "All" || doc.category === state.category;
    const haystack = [doc.title, doc.summary, doc.category, ...(doc.tags || [])]
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
    count.textContent = `${String(items.length).padStart(2, "0")} docs`;

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

      const name = document.createElement("h3");
      name.textContent = doc.title;

      const length = document.createElement("span");
      length.textContent = doc.readTime;

      titleRow.append(name, length);

      const summary = document.createElement("p");
      summary.textContent = doc.summary;

      const meta = document.createElement("div");
      meta.className = "doc-item__meta";

      (doc.tags || []).slice(0, 3).forEach((tag) => {
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

function renderEmptyReader() {
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
