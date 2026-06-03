<?php

declare(strict_types=1);

/**
 * Vercel/serverless often exposes env via getenv() but not $_ENV.
 * Hydrate both superglobals so streak code can read TOKEN, etc.
 */
function hydrateEnvFromServer(): void
{
    $keys = ["TOKEN", "WHITELIST", "DISABLE_CACHE"];

    for ($index = 2; $index <= 10; $index++) {
        $keys[] = "TOKEN{$index}";
    }

    foreach ($keys as $key) {
        $value = getenv($key);
        if ($value === false || $value === "") {
            continue;
        }

        $_ENV[$key] = $value;
        $_SERVER[$key] = $value;
    }

    // Reuse github-readme-stats PAT if streak TOKEN is not set separately
    if (
        (!isset($_ENV["TOKEN"]) || $_ENV["TOKEN"] === "") &&
        ($pat = getenv("PAT_1")) !== false &&
        $pat !== ""
    ) {
        $_ENV["TOKEN"] = $pat;
        $_SERVER["TOKEN"] = $pat;
    }
}
