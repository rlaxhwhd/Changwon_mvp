# Run the pinned Graft CLI against this checkout, independent of the caller's cwd.
$ErrorActionPreference = 'Stop'
$graftRepository = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
& docker run --rm -i --network none -e DO_NOT_TRACK=1 --mount "type=bind,source=$graftRepository,target=/workspace" -w /workspace dreamcatch-graft:0.18.0 @args
exit $LASTEXITCODE
