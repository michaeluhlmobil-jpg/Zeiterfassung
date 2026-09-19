Add-Type -AssemblyName System.Drawing

function Make-Icon {
    param([int]$size, [string]$filename)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
    $g.FillEllipse($bgBrush, [int]($size * 0.05), [int]($size * 0.05), [int]($size * 0.9), [int]($size * 0.9))

    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($whiteBrush, [int]($size * 0.2), [int]($size * 0.2), [int]($size * 0.6), [int]($size * 0.6))

    $pen1 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(15, 23, 42), [float]($size * 0.06))
    $pen1.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen1.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $center = [float]($size / 2)
    $g.DrawLine($pen1, $center, $center, [float]($center - $size * 0.16), $center)

    $pen2 = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(37, 99, 235), [float]($size * 0.045))
    $pen2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($pen2, $center, $center, [float]($center + $size * 0.12), [float]($center - $size * 0.18))

    $dotBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(15, 23, 42))
    $g.FillEllipse($dotBrush, [float]($center - $size * 0.04), [float]($center - $size * 0.04), [float]($size * 0.08), [float]($size * 0.08))

    $bmp.Save($filename, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

$iconDir = "C:\Users\Daisu\.gemini\antigravity\scratch\zeiterfassung-pwa\icons"
if (-not (Test-Path $iconDir)) {
    New-Item -ItemType Directory -Path $iconDir -Force
}

Make-Icon 192 "$iconDir\icon-192.png"
Make-Icon 512 "$iconDir\icon-512.png"
Write-Output "Icons generated successfully!"
