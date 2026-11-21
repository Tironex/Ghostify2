$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

#region Variables
$ghostifyFolderPath = "$env:LOCALAPPDATA\ghostify"
$ghostifyOldFolderPath = "$HOME\ghostify-cli"
#endregion Variables

#region Functions
function Write-Success {
  [CmdletBinding()]
  param ()
  process {
    Write-Host -Object ' > OK' -ForegroundColor 'Green'
  }
}

function Write-Unsuccess {
  [CmdletBinding()]
  param ()
  process {
    Write-Host -Object ' > ERROR' -ForegroundColor 'Red'
  }
}

function Test-Admin {
  [CmdletBinding()]
  param ()
  begin {
    Write-Host -Object "Checking if the script is not being run as administrator..." -NoNewline
  }
  process {
    $currentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
    -not $currentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
  }
}

function Test-PowerShellVersion {
  [CmdletBinding()]
  param ()
  begin {
    $PSMinVersion = [version]'5.1'
  }
  process {
    Write-Host -Object 'Checking if your PowerShell version is compatible...' -NoNewline
    $PSVersionTable.PSVersion -ge $PSMinVersion
  }
}

function Move-OldGhostifyFolder {
  [CmdletBinding()]
  param ()
  process {
    if (Test-Path -Path $ghostifyOldFolderPath) {
      Write-Host -Object 'Moving the old ghostify folder...' -NoNewline
      Copy-Item -Path "$ghostifyOldFolderPath\*" -Destination $ghostifyFolderPath -Recurse -Force
      Remove-Item -Path $ghostifyOldFolderPath -Recurse -Force
      Write-Success
    }
  }
}

function Get-Ghostify {
  [CmdletBinding()]
  param ()
  begin {
    if ($env:PROCESSOR_ARCHITECTURE -eq 'AMD64') {
      $architecture = 'x64'
    }
    elseif ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') {
      $architecture = 'arm64'
    }
    else {
      $architecture = 'x32'
    }
    if ($v) {
      if ($v -match '^\d+\.\d+\.\d+$') {
        $targetVersion = $v
      }
      else {
        Write-Warning -Message "You have specified an invalid ghostify version: $v `nThe version must be in the following format: 1.2.3"
        Pause
        exit
      }
    }
    else {
      Write-Host -Object 'Fetching the latest ghostify version...' -NoNewline
      $latestRelease = Invoke-RestMethod -Uri 'https://api.github.com/repos/spicetify/cli/releases/latest'
      $targetVersion = $latestRelease.tag_name -replace 'v', ''
      Write-Success
    }
    $archivePath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "ghostify.zip")
  }
  process {
    Write-Host -Object "Downloading ghostify v$targetVersion..." -NoNewline
    $Parameters = @{
      Uri            = "https://github.com/spicetify/cli/releases/download/v$targetVersion/spicetify-$targetVersion-windows-$architecture.zip"
      UseBasicParsin = $true
      OutFile        = $archivePath
    }
    Invoke-WebRequest @Parameters
    Write-Success
  }
  end {
    $archivePath
  }
}

function Add-GhostifyToPath {
  [CmdletBinding()]
  param ()
  begin {
    Write-Host -Object 'Making ghostify available in the PATH...' -NoNewline
    $user = [EnvironmentVariableTarget]::User
    $path = [Environment]::GetEnvironmentVariable('PATH', $user)
  }
  process {
    $path = $path -replace "$([regex]::Escape($ghostifyOldFolderPath))\\*;*", ''
    if ($path -notlike "*$ghostifyFolderPath*") {
      $path = "$path;$ghostifyFolderPath"
    }
  }
  end {
    [Environment]::SetEnvironmentVariable('PATH', $path, $user)
    if (($env:PATH -split ';') -notcontains $ghostifyFolderPath) {
      $env:PATH = "$env:PATH;$ghostifyFolderPath"
    }
    Write-Success
  }
}

function Install-Ghostify {
  [CmdletBinding()]
  param ()
  begin {
    Write-Host -Object 'Installing ghostify...'
  }
  process {
    $archivePath = Get-Ghostify
    Write-Host -Object 'Extracting ghostify...' -NoNewline
    Expand-Archive -Path $archivePath -DestinationPath $ghostifyFolderPath -Force
    Write-Success
    Add-GhostifyToPath
  }
  end {
    Remove-Item -Path $archivePath -Force -ErrorAction 'SilentlyContinue'
    Write-Host -Object 'ghostify was successfully installed!' -ForegroundColor 'Green'
  }
}
#endregion Functions

#region Main
#region Checks
if (-not (Test-PowerShellVersion)) {
  Write-Unsuccess
  Write-Warning -Message 'PowerShell 5.1 or higher is required to run this script'
  Write-Warning -Message "You are running PowerShell $($PSVersionTable.PSVersion)"
  Write-Host -Object 'PowerShell 5.1 install guide:'
  Write-Host -Object 'https://learn.microsoft.com/skypeforbusiness/set-up-your-computer-for-windows-powershell/download-and-install-windows-powershell-5-1'
  Write-Host -Object 'PowerShell 7 install guide:'
  Write-Host -Object 'https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows'
  Pause
  exit
}
else {
  Write-Success
}
if (-not (Test-Admin)) {
  Write-Unsuccess
  Write-Warning -Message "The script was run as administrator. This can result in problems with the installation process or unexpected behavior. Do not continue if you do not know what you are doing."
  $Host.UI.RawUI.Flushinputbuffer()
  $choices = [System.Management.Automation.Host.ChoiceDescription[]] @(
    (New-Object System.Management.Automation.Host.ChoiceDescription '&Yes', 'Abort installation.'),
    (New-Object System.Management.Automation.Host.ChoiceDescription '&No', 'Resume installation.')
  )
  $choice = $Host.UI.PromptForChoice('', 'Do you want to abort the installation process?', $choices, 0)
  if ($choice -eq 0) {
    Write-Host -Object 'ghostify installation aborted' -ForegroundColor 'Yellow'
    Pause
    exit
  }
}
else {
  Write-Success
}
#endregion Checks

#region Ghostify
$installedGhostify = Join-Path -Path $ghostifyFolderPath -ChildPath 'ghostify.exe'
if (-not (Test-Path -LiteralPath $installedGhostify -PathType Leaf)) {
  $installedCommand = Get-Command -Name 'ghostify' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($installedCommand) {
    $installedGhostify = $installedCommand.Source
  }
  else {
    $installedGhostify = $null
  }
}

if ($installedGhostify) {
  $Host.UI.RawUI.Flushinputbuffer()
  $choices = [System.Management.Automation.Host.ChoiceDescription[]] @(
    (New-Object System.Management.Automation.Host.ChoiceDescription '&Yes', 'Run ghostify update.'),
    (New-Object System.Management.Automation.Host.ChoiceDescription '&No', 'Continue with installation.')
  )
  $choice = $Host.UI.PromptForChoice('', 'Ghostify is already installed. Do you want to fix your installation?', $choices, 0)
  if ($choice -eq 0) {
    & $installedGhostify update
    if ($LASTEXITCODE -ne 0) {
      throw "Ghostify update failed with exit code $LASTEXITCODE."
    }
    return
  }
}

Move-OldGhostifyFolder
Install-Ghostify
Write-Host -Object "`nRun" -NoNewline
Write-Host -Object ' ghostify -h ' -NoNewline -ForegroundColor 'Cyan'
Write-Host -Object 'to get started'
#endregion Ghostify

#region Marketplace
$Host.UI.RawUI.Flushinputbuffer()
$choices = [System.Management.Automation.Host.ChoiceDescription[]] @(
    (New-Object System.Management.Automation.Host.ChoiceDescription "&Yes", "Install Ghostify Marketplace."),
    (New-Object System.Management.Automation.Host.ChoiceDescription "&No", "Do not install Ghostify Marketplace.")
)
$choice = $Host.UI.PromptForChoice('', "`nDo you also want to install Ghostify Marketplace? It will become available within the Spotify client, where you can easily install themes and extensions.", $choices, 0)
if ($choice -eq 1) {
  Write-Host -Object 'ghostify Marketplace installation aborted' -ForegroundColor 'Yellow'
}
else {
  Write-Host -Object 'Starting the ghostify Marketplace installation script..'
  $Parameters = @{
    Uri             = 'https://raw.githubusercontent.com/spicetify/spicetify-marketplace/main/resources/install.ps1'
    UseBasicParsing = $true
  }
  Invoke-WebRequest @Parameters | Invoke-Expression
}
#endregion Marketplace
#endregion Main
