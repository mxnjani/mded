Here's the implementation plan for the mdvault integration. Key decisions I made:

CLI format: mded.exe mdvault "<filename>" "<uuid>" "<filepath>" — positional args with mdvault as the marker word
Disabled in mdvault mode: New, Open, Save As buttons + their keyboard shortcuts
Only Save works: Writes directly to the UUID filepath
Please review and let me know if the CLI format and behavior look right.