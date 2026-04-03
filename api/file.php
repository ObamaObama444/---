<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

function build_ascii_download_name(string $originalName): string
{
    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
    $extension = preg_replace('/[^A-Za-z0-9]+/', '', $extension ?? '');

    $baseName = pathinfo($originalName, PATHINFO_FILENAME);

    if (function_exists('iconv')) {
        $transliterated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $baseName);

        if (is_string($transliterated) && $transliterated !== '') {
            $baseName = $transliterated;
        }
    }

    $baseName = preg_replace('/[^A-Za-z0-9._-]+/', '_', (string) $baseName);
    $baseName = trim((string) $baseName, '._-');

    if ($baseName === '') {
        $baseName = 'download';
    }

    return $extension !== '' ? $baseName . '.' . $extension : $baseName;
}

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
$asciiName = build_ascii_download_name($originalName);
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
header('Content-Disposition: ' . $disposition . '; filename="' . $asciiName . '"; filename*=UTF-8\'\'' . $encodedName);

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
