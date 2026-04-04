<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    error_response(405, 'Метод не поддерживается.');
}

$data = request_data();
$profileId = clean_public_id($data['profileId'] ?? '') ?: generate_id();
$nickname = normalize_nickname($data['nickname'] ?? '', create_guest_nickname());
$messageText = normalize_message($data['message'] ?? '');
$attachments = is_array($data['attachments'] ?? null) ? $data['attachments'] : [];
$history = is_array($data['history'] ?? null) ? $data['history'] : [];

if ($messageText === '' && count($attachments) === 0) {
    error_response(400, 'Для AI-чата нужен текст или хотя бы один файл.');
}

$messages = [
    [
        'role' => 'system',
        'content' => implode("\n", [
            'Ты сильный русскоязычный ассистент по программированию, информатике и математике.',
            'Твоя цель — давать правильные, проверяемые и полезные решения, а не общие советы.',
            'Если приложен HTML, MHT или MHTML с заданием, сначала коротко и точно перескажи условие своими словами.',
            'Для информатики и программирования давай решение по шагам, затем рабочий код и краткую проверку примера.',
            'Для математики расписывай ход решения аккуратно, с формулами, пояснениями и финальным ответом.',
            'Если в условии есть неоднозначность, задай ровно один короткий уточняющий вопрос.',
            'Если можно проверить ответ логически или примером, обязательно сделай это.',
        ]),
    ],
];

foreach (array_slice($history, -10) as $entry) {
    if (!is_array($entry)) {
        continue;
    }

    $role = ($entry['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
    $text = normalize_message($entry['text'] ?? '');

    if ($text === '') {
        continue;
    }

    $messages[] = [
        'role' => $role,
        'content' => $text,
    ];
}

$attachmentBlocks = [];

foreach (array_slice($attachments, 0, 5) as $attachment) {
    if (!is_array($attachment)) {
        continue;
    }

    $name = sanitize_filename($attachment['name'] ?? 'attachment.txt');
    $mimeType = trim((string) ($attachment['mimeType'] ?? 'text/plain'));
    $content = trim((string) ($attachment['content'] ?? ''));

    if ($content === '') {
        continue;
    }

    $attachmentBlocks[] = implode("\n", [
        "Файл: {$name}",
        "MIME: {$mimeType}",
        'Содержимое:',
        $content,
    ]);
}

$userPrompt = $messageText !== '' ? $messageText : 'Разбери вложенное задание.';

if (count($attachmentBlocks) > 0) {
    $userPrompt .= "\n\n" . implode("\n\n---\n\n", $attachmentBlocks);
}

$messages[] = [
    'role' => 'user',
    'content' => $userPrompt,
];

$config = read_local_ai_config();
$apiKeys = resolve_mistral_api_keys($config);
$models = resolve_mistral_models($config);

if (count($apiKeys) === 0) {
    error_response(500, 'На сервере не задан ни один ключ Mistral.');
}

[$assistantText, $usedModel, $remoteError] = request_mistral_with_fallbacks($messages, $apiKeys, $models);

if ($assistantText === '') {
    error_response(502, $remoteError !== '' ? $remoteError : 'Mistral вернул пустой ответ.');
}

json_response([
    'ok' => true,
    'model' => $usedModel,
    'message' => [
        'id' => generate_id(),
        'role' => 'assistant',
        'author' => 'Mistral AI',
        'profileId' => $profileId,
        'text' => $assistantText,
        'createdAt' => gmdate('c'),
        'attachments' => [],
    ],
]);

function read_local_ai_config(): array
{
    $path = storage_path('ai-config.php');

    if (!is_file($path)) {
        return [];
    }

    $config = require $path;

    return is_array($config) ? $config : [];
}

function resolve_mistral_api_keys(array $config): array
{
    $values = [];
    $envSingle = trim(env_value('MISTRAL_API_KEY'));
    $envList = preg_split('/[\s,;]+/', trim(env_value('MISTRAL_API_KEYS')), -1, PREG_SPLIT_NO_EMPTY);
    $configList = is_array($config['api_keys'] ?? null) ? $config['api_keys'] : [];

    if ($envSingle !== '') {
        $values[] = $envSingle;
    }

    foreach ([$envList, $configList] as $group) {
        foreach ($group as $value) {
            $key = trim((string) $value);

            if ($key !== '') {
                $values[] = $key;
            }
        }
    }

    return array_values(array_unique($values));
}

function resolve_mistral_models(array $config): array
{
    $values = [];
    $envSingle = trim(env_value('MISTRAL_MODEL'));
    $envList = preg_split('/[\s,;]+/', trim(env_value('MISTRAL_MODELS')), -1, PREG_SPLIT_NO_EMPTY);
    $configList = is_array($config['models'] ?? null) ? $config['models'] : [];

    foreach ([$envSingle !== '' ? [$envSingle] : [], $envList, $configList] as $group) {
        foreach ($group as $value) {
            $model = trim((string) $value);

            if ($model !== '') {
                $values[] = $model;
            }
        }
    }

    if (count($values) === 0) {
        $values = [
            'devstral-medium-2507',
            'codestral-latest',
            'mistral-small-latest',
            'mistral-large-latest',
        ];
    }

    return array_values(array_unique($values));
}

function request_mistral_with_fallbacks(array $messages, array $apiKeys, array $models): array
{
    $lastError = '';

    foreach ($models as $model) {
        foreach ($apiKeys as $apiKey) {
            [$text, $error] = request_single_mistral_completion($messages, $apiKey, $model);

            if ($text !== '') {
                return [$text, $model, ''];
            }

            if ($error !== '') {
                $lastError = $error;
            }
        }
    }

    return ['', '', $lastError];
}

function request_single_mistral_completion(array $messages, string $apiKey, string $model): array
{
    $payload = [
        'model' => $model,
        'temperature' => 0.15,
        'messages' => $messages,
    ];

    $ch = curl_init('https://api.mistral.ai/v1/chat/completions');

    if ($ch === false) {
        return ['', 'Не удалось инициализировать запрос к AI.'];
    }

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        CURLOPT_TIMEOUT => 120,
    ]);

    $raw = curl_exec($ch);
    $curlError = curl_error($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if (!is_string($raw) || $raw === '') {
        return ['', $curlError !== '' ? 'Mistral недоступен: ' . $curlError : 'Mistral вернул пустой ответ.'];
    }

    $decoded = json_decode($raw, true);

    if ($status < 200 || $status >= 300 || !is_array($decoded)) {
        $remoteMessage = '';

        if (is_array($decoded)) {
            $remoteMessage = (string) ($decoded['message'] ?? $decoded['error'] ?? ($decoded['object'] ?? ''));
        }

        $errorText = trim($remoteMessage) !== '' ? trim($remoteMessage) : 'Не удалось получить ответ от Mistral.';
        return ['', $errorText];
    }

    $assistantText = extract_mistral_text($decoded);

    if ($assistantText === '') {
        return ['', 'Mistral вернул пустой ответ.'];
    }

    return [$assistantText, ''];
}

function extract_mistral_text(array $decoded): string
{
    $message = $decoded['choices'][0]['message']['content'] ?? null;

    if (is_string($message)) {
        return trim($message);
    }

    if (!is_array($message)) {
        return '';
    }

    $parts = [];

    foreach ($message as $chunk) {
        if (is_string($chunk)) {
            $parts[] = $chunk;
            continue;
        }

        if (!is_array($chunk)) {
            continue;
        }

        if (($chunk['type'] ?? '') === 'text' && is_string($chunk['text'] ?? null)) {
            $parts[] = $chunk['text'];
        }
    }

    return trim(implode("\n", $parts));
}
