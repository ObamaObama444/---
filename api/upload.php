<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    error_response(405, 'Метод не поддерживается.');
}

if (!isset($_FILES['file']) || !is_array($_FILES['file'])) {
    error_response(400, 'Файл не был передан.');
}

$upload = $_FILES['file'];
$errorCode = (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE);

if ($errorCode !== UPLOAD_ERR_OK) {
    error_response(400, upload_error_message($errorCode));
}

$size = (int) ($upload['size'] ?? 0);

if ($size <= 0) {
    error_response(400, 'Файл пустой.');
}

if ($size > MAX_FILE_SIZE) {
    error_response(400, 'Файл слишком большой. Лимит 40 МБ.');
}

$profileId = clean_public_id($_POST['profileId'] ?? '') ?: generate_id();
$nickname = normalize_nickname($_POST['nickname'] ?? '', create_guest_nickname());
$originalName = sanitize_filename($upload['name'] ?? 'file');
$storedName = create_stored_filename($originalName);
$target = uploads_path($storedName);

if (!move_uploaded_file((string) ($upload['tmp_name'] ?? ''), $target)) {
    error_response(500, 'Не удалось сохранить файл.');
}

$fileMeta = [
    'id' => generate_id(),
    'originalName' => $originalName,
    'storedName' => $storedName,
    'mimeType' => detect_mime_type($target, (string) ($upload['type'] ?? 'application/octet-stream')),
    'size' => $size,
];

try {
    $message = append_message(create_file_message($profileId, $nickname, $fileMeta));
} catch (Throwable $error) {
    @unlink($target);
    error_response(500, 'Не удалось сохранить сообщение с файлом.');
}

json_response([
    'ok' => true,
    'message' => $message,
], 201);
