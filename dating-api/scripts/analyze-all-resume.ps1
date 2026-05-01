# POST /api/profiles/analyze-all in a resume loop until done.
# Then GET /api/profiles/stats and POST /api/v1/matches/rebuild.
# Params: limit=25, onlyUnanalyzed=1, delayMs=150, continueOnError=1, maxSeconds (optional)
# Progress: offset, processed, analyzed, failed, nextOffset, done
# When done=false, use nextOffset for the next request to resume.
# Failures are appended to data/analyze_failures.json (profileId, error, time).

$baseUrl = "http://localhost:3001"
$analyzeUrl = "${baseUrl}/api/profiles/analyze-all"
$statsUrl = "${baseUrl}/api/profiles/stats"
$recomputeUrl = "${baseUrl}/api/v1/matches/rebuild"
$limit = 25
$offset = 0
$onlyUnanalyzed = 1
$delayMs = 150
$continueOnError = 1

# Coverage before
try {
    $statsBefore = Invoke-RestMethod -Uri $statsUrl -Method Get
    Write-Host "coverage before: total=$($statsBefore.total) analyzed=$($statsBefore.analyzed) unanalyzed=$($statsBefore.unanalyzed)"
} catch {
    Write-Host "coverage before: (stats failed: $_)"
}

do {
    $uri = "${analyzeUrl}?limit=$limit&offset=$offset&onlyUnanalyzed=$onlyUnanalyzed&delayMs=$delayMs&continueOnError=$continueOnError"
    try {
        $resp = Invoke-RestMethod -Uri $uri -Method Post -ContentType "application/json"
    } catch {
        Write-Error "Request failed: $_"
        exit 1
    }

    $offset = $resp.offset
    $processed = $resp.processed
    $analyzed = $resp.analyzed
    $failed = $resp.failed
    $nextOffset = $resp.nextOffset
    $done = $resp.done

    Write-Host "offset=$offset processed=$processed analyzed=$analyzed failed=$failed nextOffset=$nextOffset done=$done"

    if ($resp.failures -and $resp.failures.Count -gt 0) {
        $resp.failures | ConvertTo-Json -Compress | Write-Host
    }

    if ($done -or $null -eq $nextOffset) { break }
    $offset = $nextOffset
} while ($true)

# Coverage after
try {
    $statsAfter = Invoke-RestMethod -Uri $statsUrl -Method Get
    Write-Host "coverage after: total=$($statsAfter.total) analyzed=$($statsAfter.analyzed) unanalyzed=$($statsAfter.unanalyzed)"
} catch {
    Write-Host "coverage after: (stats failed: $_)"
}

# Rebuild all matches (POST /api/v1/matches/rebuild; logs ok + stats)
try {
    $recompute = Invoke-RestMethod -Uri $recomputeUrl -Method Post -ContentType "application/json"
    Write-Host "rebuild done: matchCount=$($recompute.stats.matchCount) profileCount=$($recompute.stats.profileCount) pairErrors=$($recompute.stats.pairErrors)"
} catch {
    Write-Host "rebuild failed: $_"
}

exit 0
