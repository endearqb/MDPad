param(
  [Parameter(Mandatory = $true)]
  [string]$TargetPath
)

$normalizedTarget = $TargetPath.Trim().TrimEnd('\')
if ([string]::IsNullOrWhiteSpace($normalizedTarget)) {
  exit 1
}

$currentPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ([string]::IsNullOrWhiteSpace($currentPath)) {
  [Environment]::SetEnvironmentVariable('Path', $normalizedTarget, 'User')
  exit 0
}

$segments = @(
  $currentPath -split ';' |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ }
)

if ($segments -contains $normalizedTarget) {
  exit 0
}

$updated = ($segments + $normalizedTarget) -join ';'
[Environment]::SetEnvironmentVariable('Path', $updated, 'User')
