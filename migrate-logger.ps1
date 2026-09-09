# Chantier 8 - migration complète console.* -> logger.*
$root = "backend/controllers"
$changed = 0
foreach ($f in Get-ChildItem $root -Recurse -Filter '*.js') {
  $sub = $f.DirectoryName.Substring((Resolve-Path $root).Path.Length).TrimStart('\','/')
  $sousNiveaux = 0
  if ($sub) { $sousNiveaux = ($sub -split '[\\/]').Count }
  # nb de ".." = 1 (remonter de controllers/) + sous-niveaux
  $depth = $sousNiveaux + 1
  $rel = (-join ('..\' * $depth)) + 'services\logger.js'

  $t = Get-Content $f.FullName -Raw
  $orig = $t
  $ctx = $f.BaseName

  $usesConsole = [regex]::IsMatch($t, '(?m)^[ \t]*console\.(error|log|warn)\(')
  $hasLogger = [regex]::IsMatch($t, 'const\s+logger\s*=\s*require')

  if ($usesConsole -and -not $hasLogger) {
    # insérer une SEULE fois après la première ligne require
    $t = [regex]::Replace($t, "(?m)^([^\r\n]*?require\([^\r\n]*\);)\r?\n", ("`$1`r`nconst logger = require('" + $rel + "');`r`n"), 1)
  }

  $t = [regex]::Replace($t, '(?m)^([ \t]*)(//)?console\.(error|log|warn)\(', {
    param($m)
    if ($m.Groups[2].Value -eq '//') { return $m.Value }
    return $m.Groups[1].Value + 'logger.' + $m.Groups[3].Value + "('$ctx', "
  })

  if ($t -ne $orig) {
    Set-Content $f.FullName $t -NoNewline
    $changed++
  }
}
Write-Output ('fichiers modifies: ' + $changed)