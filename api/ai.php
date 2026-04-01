<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    error_response(405, 'Метод не поддерживается.');
}

$apiKey = env_value('MISTRAL_API_KEY');

if ($apiKey === '') {
    error_response(500, 'На сервере не задан MISTRAL_API_KEY.');
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
            'Ты помогаешь решать задания по программированию и математике.',
            'Отвечай по-русски, структурно и без воды.',
            'Если пользователь приложил HTML или текст задания, сначала коротко перескажи условие, затем предложи решение.',
            'Для программирования давай рабочие шаги, код и пояснения.',
            'Для математики расписывай ход решения по шагам.',
            'Если информации мало, задай один короткий уточняющий вопрос.',
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

$payload = [
    'model' => env_value('MISTRAL_MODEL', 'mistral-large-latest'),
    'temperature' => 0.2,
    'messages' => $messages,
];

$ch = curl_init('https://api.mistral.ai/v1/chat/completions');

if ($ch === false) {
    error_response(500, 'Не удалось инициализировать запрос к AI.');
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
    CURLOPT_TIMEOUT => 90,
]);

$raw = curl_exec($ch);
$curlError = curl_error($ch);
$status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if (!is_string($raw) || $raw === '') {
    error_response(502, $curlError !== '' ? 'Mistral недоступен: ' . $curlError : 'Mistral вернул пустой ответ.');
}

$decoded = json_decode($raw, true);

if ($status < 200 || $status >= 300 || !is_array($decoded)) {
    $remoteMessage = is_array($decoded) ? ($decoded['message'] ?? $decoded['error'] ?? '') : '';
    $errorText = is_string($remoteMessage) && $remoteMessage !== '' ? $remoteMessage : 'Не удалось получить ответ от Mistral.';
    error_response(502, $errorText);
}

$assistantText = extract_mistral_text($decoded);

if ($assistantText === '') {
    error_response(502, 'Mistral вернул пустой ответ.');
}

json_response([
    'ok' => true,
    'model' => (string) ($payload['model'] ?? ''),
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
