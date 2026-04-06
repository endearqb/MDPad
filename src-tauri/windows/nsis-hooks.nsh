!macro NSIS_HOOK_POSTINSTALL
  IfFileExists "$INSTDIR\cli\mdpad-cli.exe" 0 +3
  CopyFiles /SILENT "$INSTDIR\cli\mdpad-cli.exe" "$INSTDIR\mdpad-cli.exe"
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\installer-scripts\add-user-path.ps1" -TargetPath "$INSTDIR"'
  SendMessage ${HWND_BROADCAST} 0x001A 0 "STR:Environment" /TIMEOUT=5000
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::ExecToLog '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$INSTDIR\installer-scripts\remove-user-path.ps1" -TargetPath "$INSTDIR"'
  Delete "$INSTDIR\mdpad-cli.exe"
  SendMessage ${HWND_BROADCAST} 0x001A 0 "STR:Environment" /TIMEOUT=5000
!macroend
