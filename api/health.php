<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

json_response([
    'ok' => true,
    'messages' => count(read_messages()),
]);
