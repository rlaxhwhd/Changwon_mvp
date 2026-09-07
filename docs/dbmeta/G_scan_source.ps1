# ══════════════════════════════════════════════════════════════════════════
#  G. 소스 코드 스캔 — 테이블 사용 맵 추출          [원격 서버에서 실행]
#
#   목적: 소스를 반출하지 않고 "어떤 테이블을 어디서 어떻게 쓰는가"만 뽑는다.
#         → 테이블별 소유권 판정(읽기전용=학사유래 / 쓰기있음=자체소유)
#         → 조인 관계 복원 (이 DB는 FK가 3건뿐이라 이게 유일한 근거)
#
#   실행: PowerShell 창에 통째로 붙여넣기. 설치·인터넷 불필요.
#         소스 파일은 읽기만 하고 아무것도 수정하지 않는다.
# ══════════════════════════════════════════════════════════════════════════

# ▼▼▼ 여기만 수정 — 소스 루트 경로 ▼▼▼
$SRC = 'C:\소스경로\여기를수정'

$OUT = Join-Path $env:USERPROFILE 'Desktop\srcscan'
New-Item -ItemType Directory -Force $OUT | Out-Null

Write-Host "스캔 시작: $SRC"

$files = Get-ChildItem $SRC -Recurse -File -Include *.jsp,*.java,*.xml,*.properties `
         -ErrorAction SilentlyContinue |
         Where-Object { $_.FullName -notmatch '\\(lib|build|target|node_modules|\.git|\.svn)\\' }

Write-Host ("대상 파일: {0}개" -f $files.Count)

# ── 1) 파일 인벤토리 — 소스 구조 파악 ────────────────────────────────────
$files | Group-Object Extension |
  Select-Object @{n='확장자';e={$_.Name}}, @{n='개수';e={$_.Count}} |
  Sort-Object 개수 -Descending |
  Export-Csv (Join-Path $OUT '1_files.csv') -NoTypeInformation -Encoding UTF8

# 상위 폴더 구조 (2단계까지)
$files | ForEach-Object {
    $rel = $_.FullName.Substring($SRC.Length).TrimStart('\')
    ($rel -split '\\')[0..1] -join '\'
  } | Group-Object | Sort-Object Count -Descending |
  Select-Object @{n='폴더';e={$_.Name}}, @{n='파일수';e={$_.Count}} |
  Export-Csv (Join-Path $OUT '2_folders.csv') -NoTypeInformation -Encoding UTF8

# ── 2) SQL에서 테이블 참조 추출 ───────────────────────────────────────────
$rx = [regex]'(?is)\b(from|join|insert\s+into|update|delete\s+from)\s+([A-Za-z_][A-Za-z0-9_$#]{2,})'
$rows = New-Object System.Collections.ArrayList

foreach ($f in $files) {
  $t = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
  if (-not $t) { continue }
  $rel = $f.FullName.Substring($SRC.Length).TrimStart('\')
  foreach ($m in $rx.Matches($t)) {
    $null = $rows.Add([pscustomobject]@{
      File  = $rel
      Op    = ($m.Groups[1].Value -replace '\s+',' ').ToUpper()
      Table = $m.Groups[2].Value.ToUpper()
    })
  }
}

Write-Host ("SQL 참조: {0}건" -f $rows.Count)

# ── 3) 테이블별 요약 ★ 이것만 가져와도 소유권 판정이 된다 ─────────────────
$rows | Group-Object Table | ForEach-Object {
    $g = $_.Group
    [pscustomobject]@{
      TABLE   = $_.Name
      TOTAL   = $_.Count
      READ    = @($g | Where-Object { $_.Op -eq 'FROM' -or $_.Op -eq 'JOIN' }).Count
      INSERT  = @($g | Where-Object { $_.Op -like 'INSERT*' }).Count
      UPDATE  = @($g | Where-Object { $_.Op -eq 'UPDATE' }).Count
      DELETE  = @($g | Where-Object { $_.Op -like 'DELETE*' }).Count
      FILES   = @($g | Select-Object -ExpandProperty File -Unique).Count
    }
  } | Sort-Object TOTAL -Descending |
  Export-Csv (Join-Path $OUT '3_table_summary.csv') -NoTypeInformation -Encoding UTF8

# ── 4) 원본 참조 목록 (파일 단위 추적용, 용량 큼) ─────────────────────────
$rows | Export-Csv (Join-Path $OUT '4_usage_raw.csv') -NoTypeInformation -Encoding UTF8

# ── 5) 조인문 추출 ★ 관계 복원의 근거 ─────────────────────────────────────
#     "A.컬럼 = B.컬럼" 형태만 뽑는다. 이게 ERD의 선이 된다.
$rxJoin = [regex]'(?i)([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)'
$joins = New-Object System.Collections.ArrayList
foreach ($f in $files) {
  $t = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
  if (-not $t) { continue }
  foreach ($m in $rxJoin.Matches($t)) {
    $null = $joins.Add(('{0}.{1} = {2}.{3}' -f $m.Groups[1].Value.ToUpper(), $m.Groups[2].Value.ToUpper(),
                                                $m.Groups[3].Value.ToUpper(), $m.Groups[4].Value.ToUpper()))
  }
}
$joins | Group-Object | Sort-Object Count -Descending |
  Select-Object @{n='JOIN조건';e={$_.Name}}, @{n='출현횟수';e={$_.Count}} |
  Export-Csv (Join-Path $OUT '5_joins.csv') -NoTypeInformation -Encoding UTF8

# ── 6) 배치·스케줄러 흔적 ────────────────────────────────────────────────
#     V_USR_INF 를 채우는 연계 배치가 어디 있는지 단서를 찾는다.
Select-String -Path $files.FullName -Pattern 'V_USR_INF|V_DEP_INF|V_BRDB|V_SUGANG|V_LECT_INF|@V_BRDB' `
  -ErrorAction SilentlyContinue |
  Select-Object @{n='파일';e={$_.Path.Substring($SRC.Length).TrimStart('\')}},
                @{n='줄';e={$_.LineNumber}},
                @{n='내용';e={$_.Line.Trim()}} |
  Export-Csv (Join-Path $OUT '6_academic_link.csv') -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "완료. 결과 위치: $OUT"
Write-Host "  3_table_summary.csv  ← 이것부터 확인"
Write-Host "  5_joins.csv          ← 관계 복원"
Write-Host "  6_academic_link.csv  ← 학사 연계 코드 위치"
Write-Host ""
Write-Host "※ DB 접속 설정은 아래로 직접 확인 (비밀번호가 보이므로 공유 금지)"
Write-Host "   Select-String -Path `"$SRC\*`" -Recurse -Pattern 'jdbc:' | Select -First 20"
