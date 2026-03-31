<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $afterId = clean_public_id($_GET['after'] ?? '');

    json_response([
        'ok' => true,
        'messages' => messages_after($afterId),
    ]);
}

if ($method !== 'POST') {
    error_response(405, 'Метод не поддерживается.');
}

$data = request_data();
$profileId = clean_public_id($data['profileId'] ?? '') ?: generate_id();
$nickname = normalize_nickname($data['nickname'] ?? '', create_guest_nickname());
$text = normalize_message($data['text'] ?? '');

if ($text === '') {
    error_response(400, 'Сообщение пустое.');
}

try {
    $message = append_message(create_text_message($profileId, $nickname, $text));
} catch (Throwable $error) {
    error_response(500, 'Не удалось сохранить сообщение.');
}

json_response([
    'ok' => true,
    'message' => $message,
], 201);
