<?php

declare(strict_types=1);

const MAX_HISTORY = 250;
const MAX_MESSAGE_LENGTH = 1500;
const MAX_FILE_SIZE = 26214400;

ensure_storage_ready();

function ensure_storage_ready(): void
{
    $storageRoot = storage_path();
    $uploadsRoot = uploads_path();

    if (!is_dir($storageRoot)) {
        mkdir($storageRoot, 0775, true);
    }

    if (!is_dir($uploadsRoot)) {
        mkdir($uploadsRoot, 0775, true);
    }

    if (!file_exists(messages_file())) {
        file_put_contents(messages_file(), "[]\n", LOCK_EX);
    }
}

function project_root(): string
{
    return dirname(__DIR__);
}

function storage_path(string $suffix = ''): string
{
    $base = project_root() . '/storage';

    if ($suffix === '') {
        return $base;
    }

    return $base . '/' . ltrim($suffix, '/');
}

function uploads_path(string $suffix = ''): string
{
    $base = storage_path('uploads');

    if ($suffix === '') {
        return $base;
    }

    return $base . '/' . ltrim($suffix, '/');
}

function messages_file(): string
{
    return storage_path('messages.json');
}

function json_response(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function error_response(int $status, string $message): void
{
    json_response([
        'ok' => false,
        'error' => $message,
    ], $status);
}

function text_response(string $message, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    echo $message;
    exit;
}

function request_data(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $normalizedContentType = strtolower(trim((string) strtok($contentType, ';')));

    if ($normalizedContentType === 'application/json') {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw ?: '', true);

        return is_array($decoded) ? $decoded : [];
    }

    return is_array($_POST) ? $_POST : [];
}

function read_messages(): array
{
    $handle = fopen(messages_file(), 'c+');

    if ($handle === false) {
        return [];
    }

    flock($handle, LOCK_SH);
    rewind($handle);
    $raw = stream_get_contents($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return normalize_messages(decoded_messages($raw));
}

function append_message(array $message): array
{
    $handle = fopen(messages_file(), 'c+');

    if ($handle === false) {
        throw new RuntimeException('Не удалось открыть хранилище сообщений.');
    }

    flock($handle, LOCK_EX);
    rewind($handle);
    $raw = stream_get_contents($handle);
    $messages = normalize_messages(decoded_messages($raw));
    $messages[] = $message;
    $messages = array_values(array_slice($messages, -MAX_HISTORY));

    $encoded = json_encode($messages, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($encoded === false) {
        flock($handle, LOCK_UN);
        fclose($handle);
        throw new RuntimeException('Не удалось сериализовать сообщения.');
    }

    rewind($handle);
    ftruncate($handle, 0);
    fwrite($handle, $encoded . "\n");
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);

    return $message;
}

function messages_after(?string $afterId): array
{
    $messages = read_messages();

    if ($afterId === null || $afterId === '') {
        return $messages;
    }

    $matchIndex = null;

    foreach ($messages as $index => $message) {
        if (($message['id'] ?? '') === $afterId) {
            $matchIndex = $index;
            break;
        }
    }

    if ($matchIndex === null) {
        return $messages;
    }

    return array_values(array_slice($messages, $matchIndex + 1));
}

function find_file_message(string $fileId): ?array
{
    foreach (read_messages() as $message) {
        if (($message['file']['id'] ?? '') === $fileId) {
            return $message;
        }
    }

    return null;
}

function decoded_messages($raw): array
{
    if (!is_string($raw) || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);

    return is_array($decoded) ? $decoded : [];
}

function normalize_messages(array $messages): array
{
    return array_values(array_filter($messages, static function ($message): bool {
        return is_array($message) && isset($message['id'], $message['type'], $message['createdAt']);
    }));
}

function create_guest_nickname(): string
{
    return 'Гость ' . random_int(1000, 9999);
}

function normalize_nickname($value, string $fallback): string
{
    $text = preg_replace('/\s+/u', ' ', (string) ($value ?? ''));
    $text = trim((string) $text);
    $text = substr($text, 0, 24);

    return $text !== '' ? $text : $fallback;
}

function normalize_message($value): string
{
    $text = str_replace("\r\n", "\n", (string) ($value ?? ''));
    $text = str_replace("\0", '', $text);
    $text = trim($text);
    $text = substr($text, 0, MAX_MESSAGE_LENGTH);

    return $text;
}

function clean_public_id($value): string
{
    $text = preg_replace('/[^\w-]/', '', (string) ($value ?? ''));

    return substr((string) $text, 0, 64);
}

function sanitize_filename($value): string
{
    $clean = basename((string) ($value ?? 'file'));
    $clean = preg_replace('/[^\w.\-() ]/u', '_', $clean);
    $clean = trim((string) $clean);
    $clean = substr($clean, 0, 120);

    return $clean !== '' ? $clean : 'file';
}

function generate_id(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function create_text_message(string $profileId, string $nickname, string $text): array
{
    return [
        'id' => generate_id(),
        'type' => 'text',
        'author' => $nickname,
        'profileId' => $profileId,
        'text' => $text,
        'createdAt' => gmdate('c'),
    ];
}

function create_file_message(string $profileId, string $nickname, array $fileMeta): array
{
    return [
        'id' => generate_id(),
        'type' => 'file',
        'author' => $nickname,
        'profileId' => $profileId,
        'createdAt' => gmdate('c'),
        'file' => $fileMeta,
    ];
}

function create_stored_filename(string $originalName): string
{
    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
    $extension = preg_replace('/[^\w]/', '', $extension);
    $extension = $extension !== '' ? '.' . substr((string) $extension, 0, 16) : '';

    return time() . '-' . generate_id() . $extension;
}

function detect_mime_type(string $path, string $fallback = 'application/octet-stream'): string
{
    if (function_exists('finfo_open')) {
        $finfo = finfo_open(FILEINFO_MIME_TYPE);

        if ($finfo !== false) {
            $detected = finfo_file($finfo, $path);
            finfo_close($finfo);

            if (is_string($detected) && $detected !== '') {
                return $detected;
            }
        }
    }

    if (function_exists('mime_content_type')) {
        $detected = mime_content_type($path);

        if (is_string($detected) && $detected !== '') {
            return $detected;
        }
    }

    return $fallback;
}

function upload_error_message(int $errorCode): string
{
    if ($errorCode === UPLOAD_ERR_INI_SIZE || $errorCode === UPLOAD_ERR_FORM_SIZE) {
        return 'Файл слишком большой. Лимит 25 МБ.';
    }

    if ($errorCode === UPLOAD_ERR_NO_FILE) {
        return 'Файл не был передан.';
    }

    return 'Не удалось загрузить файл.';
}

