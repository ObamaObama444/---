<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$fileId = clean_public_id($_GET['id'] ?? '');
$mode = ($_GET['mode'] ?? 'download') === 'inline' ? 'inline' : 'download';

if ($fileId === '') {
    text_response('Файл не найден.', 404);
}

$message = find_file_message($fileId);

if ($message === null || !isset($message['file']) || !is_array($message['file'])) {
    text_response('Файл не найден.', 404);
}

$file = $message['file'];
$target = uploads_path((string) ($file['storedName'] ?? ''));

if (!is_file($target)) {
    text_response('Файл отсутствует на диске.', 404);
}

$mimeType = (string) ($file['mimeType'] ?? 'application/octet-stream');
$originalName = sanitize_filename($file['originalName'] ?? 'file');
$encodedName = rawurlencode($originalName);
$disposition = $mode === 'inline' ? 'inline' : 'attachment';

header('Content-Type: ' . $mimeType);
header('Content-Length: ' . (string) filesize($target));
header('X-Content-Type-Options: nosniff');
header('Content-Disposition: ' . $disposition . '; filename="' . $originalName . '"; filename*=UTF-8\'\'' . $encodedName);

readfile($target);
exit;
