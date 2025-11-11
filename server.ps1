Param(
  [int]$Port = 8000,
  [string]$Root = (Resolve-Path ".")
)

$prefix = "http://localhost:$Port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
$listener.Start()
Write-Output "Serving $Root at $prefix"

function Get-ContentType($path) {
  switch ([IO.Path]::GetExtension($path).ToLower()) {
    ".html" { return "text/html" }
    ".css"  { return "text/css" }
    ".js"   { return "application/javascript" }
    ".json" { return "application/json" }
    ".png"  { return "image/png" }
    ".jpg"  { return "image/jpeg" }
    ".jpeg" { return "image/jpeg" }
    ".svg"  { return "image/svg+xml" }
    default  { return "application/octet-stream" }
  }
}

while ($listener.IsListening) {
  try {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    $path = $req.Url.AbsolutePath.TrimStart('/')
    if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }
    $full = Join-Path $Root $path
    if (Test-Path $full) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $res.ContentType = Get-ContentType $full
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $res.StatusCode = 404
      $msg = [Text.Encoding]::UTF8.GetBytes("Not Found")
      $res.OutputStream.Write($msg,0,$msg.Length)
    }
    $res.OutputStream.Close()
  } catch {
    # Ignorar errores transitorios
  }
}