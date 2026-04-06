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
  exit 0
}

$segments = @(
  $currentPath -split ';' |
    ForEach-Object { $_.Trim() } |
    Where-Object { $_ -and $_ -ne $normalizedTarget }
)

if ($segments.Count -eq 0) {
  [Environment]::SetEnvironmentVariable('Path', $null, 'User')
  exit 0
}

[Environment]::SetEnvironmentVariable('Path', ($segments -join ';'), 'User')
