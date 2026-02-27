; Zero-dependency NSIS hooks for PATH management.
; Uses ONLY built-in NSIS commands — no !include, no plugins.
; HWND_BROADCAST = 0xFFFF, WM_WININICHANGE = 0x001A

!macro NSIS_HOOK_POSTINSTALL
  ; Read current user PATH from registry
  ReadRegStr $0 HKCU "Environment" "Path"

  ; If PATH is empty, just set it to $INSTDIR
  StrCmp $0 "" 0 +3
    WriteRegExpandStr HKCU "Environment" "Path" "$INSTDIR"
    Goto post_install_done

  ; PATH is not empty — append ;$INSTDIR
  WriteRegExpandStr HKCU "Environment" "Path" "$0;$INSTDIR"

  post_install_done:
  ; Broadcast environment change so new terminals pick it up immediately
  SendMessage 0xFFFF 0x001A 0 "STR:Environment" /TIMEOUT=5000
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Read current user PATH
  ReadRegStr $0 HKCU "Environment" "Path"

  ; Use PowerShell to cleanly remove $INSTDIR from PATH
  ; This avoids needing any NSIS string-manipulation plugins
  nsExec::ExecToLog `powershell.exe -NoProfile -Command "& { $$p = [Environment]::GetEnvironmentVariable('Path','User'); if ($$p) { $$parts = $$p -split ';' | Where-Object { $$_ -ne '$INSTDIR' -and $$_ -ne '' }; [Environment]::SetEnvironmentVariable('Path', ($$parts -join ';'), 'User') } }"`

  ; Broadcast environment change
  SendMessage 0xFFFF 0x001A 0 "STR:Environment" /TIMEOUT=5000
!macroend
