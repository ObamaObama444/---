<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

$fileId = clean_public_id($_GET['id'] ?? '');
$mode = ($_GET['mode'] ?? 'download') === 'inline' ? 'inline' : 'download';

if ($fileId === '') {
    text_response('Файл не найден.', 404);
}

$file = find_file_meta($fileId);

if ($file === null) {
    text_response('Файл не найден.', 404);
}
$target = uploads_path((string) ($file['storedName'] ?? ''));

if (!is_file($target)) {
    text_response('Файл отсутствует на диске.', 404);
}

$mimeType = (string) ($file['mimeType'] ?? 'application/octet-stream');
$originalName = sanitize_filename($file['originalName'] ?? 'file');
$encodedName = rawurlencode($originalName);
$disposition = $mode === 'inline' ? 'inline' : 'attachment';

while (ob_get_level() > 0) {
    ob_end_clean();
}

ignore_user_abort(true);
set_time_limit(0);

header('Content-Type: ' . $mimeType);
header('Content-Length: ' . (string) filesize($target));
header('X-Content-Type-Options: nosniff');
header('Accept-Ranges: bytes');
header('Cache-Control: public, max-age=31536000, immutable');
header('Content-Description: File Transfer');
header('Content-Disposition: ' . $disposition . '; filename="' . $originalName . '"; filename*=UTF-8\'\'' . $encodedName);

$handle = fopen($target, 'rb');

if ($handle === false) {
    text_response('Не удалось открыть файл.', 500);
}

while (!feof($handle)) {
    $chunk = fread($handle, 1048576);

    if ($chunk === false) {
        break;
    }

    echo $chunk;
    flush();
}

fclose($handle);
exit;
