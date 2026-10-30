param (
    [string]$Message
)

$desktop = [Environment]::GetFolderPath('Desktop')
$file = Join-Path $desktop 'tro_chuyen_notepad.txt'

$header = @"
=============================================================
🤖 HỆ THỐNG GIAO TIẾP VỚI AGENT (RAG - codeSmrtltv2)
=============================================================
Thời gian cập nhật: $(Get-Date -Format 'HH:mm:ss dd/MM/yyyy')

"@

$footer = @"

=============================================================
(Gợi ý: Bạn có thể nhập ý kiến / thông tin của bạn vào bên dưới
 và lưu file [Ctrl+S], hoặc trao đổi trực tiếp trong khung Chat IDE!)
=============================================================
"@

$fullContent = $header + $Message + $footer
[System.IO.File]::WriteAllText($file, $fullContent, [System.Text.Encoding]::UTF8)

# Check if notepad is already editing this file
$procs = Get-Process notepad -ErrorAction SilentlyContinue
Start-Process notepad $file
Write-Output "Sent message to $file and launched Notepad."
