<?php

declare(strict_types=1);

require_once "env.php";
hydrateEnvFromServer();

require_once "stats.php";
require_once "card.php";
require_once "cache.php";
require_once "generator.php";

if (!isset($_ENV["TOKEN"]) || $_ENV["TOKEN"] === "") {
    renderOutput(
        "Missing TOKEN environment variable. Add TOKEN in Vercel project settings and redeploy.",
        500,
    );
}

// set cache to refresh once per day (24 hours)
$cacheSeconds = CACHE_DURATION;
header("Expires: " . gmdate("D, d M Y H:i:s", time() + $cacheSeconds) . " GMT");
header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
header("Cache-Control: public, max-age=$cacheSeconds");

// redirect to demo site if user is not given
if (!isset($_REQUEST["user"])) {
    header("Location: demo/");
    exit();
}

try {
    $stats = generateStreakStats($_REQUEST["user"], $_REQUEST);
    renderOutput($stats);
} catch (InvalidArgumentException | AssertionError $error) {
    error_log("Error {$error->getCode()}: {$error->getMessage()}");
    if ($error->getCode() >= 500) {
        error_log($error->getTraceAsString());
    }
    renderOutput($error->getMessage(), $error->getCode());
}
