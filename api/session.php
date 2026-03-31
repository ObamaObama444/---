<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    error_response(405, 'Метод не поддерживается.');
}

$data = request_data();
$profileId = clean_public_id($data['profileId'] ?? '') ?: generate_id();
$nickname = normalize_nickname($data['nickname'] ?? '', create_guest_nickname());

json_response([
    'ok' => true,
    'session' => [
        'profileId' => $profileId,
        'nickname' => $nickname,
    ],
    'messages' => read_messages(),
]);
