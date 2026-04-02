<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $docId = clean_public_id($_GET['docId'] ?? '');
    $afterId = clean_public_id($_GET['after'] ?? '');

    if ($docId === '') {
        error_response(400, 'Не указан модуль.');
    }

    json_response([
        'ok' => true,
        'comments' => comments_for_doc($docId, $afterId),
    ]);
}

if ($method !== 'POST') {
    error_response(405, 'Метод не поддерживается.');
}

$data = request_data();
$docId = clean_public_id($data['docId'] ?? '');
$profileId = clean_public_id($data['profileId'] ?? '') ?: generate_id();
$nickname = normalize_nickname($data['nickname'] ?? '', create_guest_nickname());
$text = normalize_message($data['text'] ?? '');

if ($docId === '') {
    error_response(400, 'Не указан модуль.');
}

if ($text === '') {
    error_response(400, 'Комментарий пустой.');
}

try {
    $comment = append_comment(create_comment_text_message($docId, $profileId, $nickname, $text));
} catch (Throwable $error) {
    error_response(500, 'Не удалось сохранить комментарий.');
}

json_response([
    'ok' => true,
    'comment' => $comment,
], 201);
