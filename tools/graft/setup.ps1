param([switch]$SkipImageBuild)
$ErrorActionPreference = 'Stop'
$graftRepository = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $SkipImageBuild) {
    & docker build -t dreamcatch-graft:0.18.0 $PSScriptRoot
    if ($LASTEXITCODE -ne 0) { throw 'Graft image build failed.' }
}
$graftArguments = @('run', '--rm', '-i', '--network', 'none', '-e', 'DO_NOT_TRACK=1', '--mount', "type=bind,source=$graftRepository,target=/workspace", '-w', '/workspace', 'dreamcatch-graft:0.18.0')
& docker @graftArguments build --only-dir src_landing --only-dir src_v2 --only-dir src_admin --only-dir shared --only-dir backend/app --only-dir backend/tests --no-ignore
if ($LASTEXITCODE -ne 0) { throw 'Graft graph build failed.' }
& codex mcp add graft-changwon -- docker @graftArguments mcp
if ($LASTEXITCODE -ne 0) { throw 'Codex MCP registration failed.' }
Push-Location $graftRepository
try {
    # Claude refuses duplicate names: remove only this integration before re-registering.
    $graftPreviousErrorAction = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        & claude mcp get graft-changwon *> $null
        $graftEntryExists = $LASTEXITCODE -eq 0
    } finally {
        $ErrorActionPreference = $graftPreviousErrorAction
    }
    if ($graftEntryExists) {
        & claude mcp remove --scope local graft-changwon
        if ($LASTEXITCODE -ne 0) { throw 'Existing Graft entry uses another scope; inspect it before replacing.' }
    }
    & claude mcp add --scope local graft-changwon -- docker @graftArguments mcp
    if ($LASTEXITCODE -ne 0) { throw 'Claude MCP registration failed.' }
} finally {
    Pop-Location
}
