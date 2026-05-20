param(
  [string]$BaseUrl = "http://localhost:8080/api/v1",
  [string]$AdminEmail = "admin@example.com",
  [string]$AdminPassword = "password123",
  [switch]$KeepProducts
)

$ErrorActionPreference = "Stop"

function Invoke-JsonRequest {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [object]$Body = $null,
    [hashtable]$Headers = @{}
  )

  $params = @{
    Method      = $Method
    Uri         = $Uri
    Headers     = $Headers
    ContentType = "application/json"
    TimeoutSec  = 30
  }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 30)
  }

  try {
    return Invoke-RestMethod @params
  } catch {
    $message = $_.Exception.Message
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
      $message = $_.ErrorDetails.Message
    }
    throw "Request failed: $Method $Uri :: $message"
  }
}

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw "Assertion failed: $Message"
  }
}

function Get-ItemCount {
  param([object]$Value)

  if ($null -eq $Value) {
    return 0
  }
  if ($Value -is [System.Array]) {
    return $Value.Count
  }
  if ($Value -is [System.Collections.ICollection]) {
    return $Value.Count
  }
  return 1
}

function Get-ProductData {
  param(
    [string]$ProductId,
    [hashtable]$Headers
  )

  $response = Invoke-JsonRequest -Method "GET" -Uri "$BaseUrl/admin/products/$ProductId" -Headers $Headers
  Assert-True ($response.success -eq $true) "GET product $ProductId should succeed"
  Assert-True ($null -ne $response.data.product) "GET product $ProductId should include data.product"
  return $response.data.product
}

function New-BaseProductPayload {
  param(
    [string]$Name,
    [string]$Sku,
    [int]$Stock = 10
  )

  return @{
    name              = $Name
    description       = "Smoke test product. Safe to delete."
    short_description = "Smoke test product"
    regular_price     = 123000
    sale_price        = 0
    stock_quantity    = $Stock
    brand             = "Smoke"
    sku               = $Sku
    status            = "draft"
    image_urls        = @()
    variant_images    = @()
  }
}

$createdProductIds = New-Object System.Collections.Generic.List[string]
$runId = Get-Date -Format "yyyyMMddHHmmss"

Write-Host "Admin product smoke test started ($runId)"

try {
  $login = Invoke-JsonRequest -Method "POST" -Uri "$BaseUrl/auth/login" -Body @{
    email    = $AdminEmail
    password = $AdminPassword
  }
  Assert-True ($login.success -eq $true) "admin login should succeed"
  Assert-True ([string]::IsNullOrWhiteSpace($login.data.access_token) -eq $false) "admin login should return access_token"

  $headers = @{ Authorization = "Bearer $($login.data.access_token)" }

  Write-Host "1. Create product without variant"
  $plainPayload = New-BaseProductPayload -Name "SMOKE Product Plain $runId" -Sku "SMOKE-PLAIN-$runId" -Stock 5
  $plainCreate = Invoke-JsonRequest -Method "POST" -Uri "$BaseUrl/admin/products" -Headers $headers -Body $plainPayload
  Assert-True ($plainCreate.success -eq $true) "plain product create should succeed"
  $plainProduct = $plainCreate.data
  $createdProductIds.Add($plainProduct.id)
  Assert-True ($plainProduct.name -eq $plainPayload.name) "plain product name should match"
  Assert-True ((Get-ItemCount $plainProduct.variant_types) -eq 0) "plain product should not have variant types"
  Assert-True ((Get-ItemCount $plainProduct.combinations) -eq 0) "plain product should not have combinations"

  Write-Host "2. Edit product without changing variant"
  $plainCurrent = Get-ProductData -ProductId $plainProduct.id -Headers $headers
  $plainUpdate = Invoke-JsonRequest -Method "PUT" -Uri "$BaseUrl/admin/products/$($plainProduct.id)" -Headers $headers -Body @{
    version           = $plainCurrent.version
    name              = "$($plainPayload.name) Updated"
    short_description = "Updated without variant"
    stock_quantity    = 7
  }
  Assert-True ($plainUpdate.success -eq $true) "plain product update should succeed"
  $plainAfterUpdate = Get-ProductData -ProductId $plainProduct.id -Headers $headers
  Assert-True ($plainAfterUpdate.stock_quantity -eq 7) "plain product stock should update"
  Assert-True ((Get-ItemCount $plainAfterUpdate.variant_types) -eq 0) "plain product update should preserve no variants"

  Write-Host "3. Create product with one variant type"
  $oneTypePayload = New-BaseProductPayload -Name "SMOKE Product One Variant $runId" -Sku "SMOKE-ONE-$runId" -Stock 12
  $oneTypePayload.variant_types = @(
    @{
      name          = "Size"
      is_visual     = $false
      display_order = 0
      options       = @("S", "M")
    }
  )
  $oneTypePayload.combinations = @(
    @{
      option_values    = @("S")
      price_adjustment = 0
      stock_quantity   = 4
      sku              = "SMOKE-ONE-$runId-S"
      is_active        = $true
    },
    @{
      option_values    = @("M")
      price_adjustment = 15000
      stock_quantity   = 8
      sku              = "SMOKE-ONE-$runId-M"
      is_active        = $true
    }
  )
  $oneTypeCreate = Invoke-JsonRequest -Method "POST" -Uri "$BaseUrl/admin/products" -Headers $headers -Body $oneTypePayload
  Assert-True ($oneTypeCreate.success -eq $true) "one-type product create should succeed"
  $oneTypeProduct = $oneTypeCreate.data
  $createdProductIds.Add($oneTypeProduct.id)
  Assert-True ((Get-ItemCount $oneTypeProduct.variant_types) -eq 1) "one-type product should have one variant type"
  Assert-True ((Get-ItemCount $oneTypeProduct.variant_types[0].options) -eq 2) "one-type product should have two options"
  Assert-True ((Get-ItemCount $oneTypeProduct.combinations) -eq 2) "one-type product should have two combinations"

  Write-Host "4. Create product with two variant types"
  $twoTypePayload = New-BaseProductPayload -Name "SMOKE Product Two Variant $runId" -Sku "SMOKE-TWO-$runId" -Stock 20
  $twoTypePayload.variant_types = @(
    @{
      name          = "Storage"
      is_visual     = $false
      display_order = 0
      options       = @("128GB", "256GB")
    },
    @{
      name          = "Color"
      is_visual     = $true
      display_order = 1
      options       = @("Orange", "Navy")
    }
  )
  $twoTypePayload.combinations = @(
    @{
      option_values    = @("128GB", "Orange")
      price_adjustment = 0
      stock_quantity   = 5
      sku              = "SMOKE-TWO-$runId-128-ORG"
      is_active        = $true
    },
    @{
      option_values    = @("128GB", "Navy")
      price_adjustment = 10000
      stock_quantity   = 6
      sku              = "SMOKE-TWO-$runId-128-NVY"
      is_active        = $true
    },
    @{
      option_values    = @("256GB", "Navy")
      price_adjustment = 25000
      stock_quantity   = 3
      sku              = "SMOKE-TWO-$runId-256-NVY"
      is_active        = $true
    }
  )
  $twoTypeCreate = Invoke-JsonRequest -Method "POST" -Uri "$BaseUrl/admin/products" -Headers $headers -Body $twoTypePayload
  Assert-True ($twoTypeCreate.success -eq $true) "two-type product create should succeed"
  $twoTypeProduct = $twoTypeCreate.data
  $createdProductIds.Add($twoTypeProduct.id)
  Assert-True ((Get-ItemCount $twoTypeProduct.variant_types) -eq 2) "two-type product should have two variant types"
  Assert-True ((Get-ItemCount $twoTypeProduct.combinations) -eq 3) "two-type product should have three combinations"

  Write-Host "5. Edit product by adding/removing option"
  $twoTypeCurrent = Get-ProductData -ProductId $twoTypeProduct.id -Headers $headers
  $twoTypeUpdate = Invoke-JsonRequest -Method "PUT" -Uri "$BaseUrl/admin/products/$($twoTypeProduct.id)" -Headers $headers -Body @{
    version       = $twoTypeCurrent.version
    name          = "$($twoTypePayload.name) Updated"
    variant_types = @(
      @{
        name          = "Storage"
        is_visual     = $false
        display_order = 0
        options       = @("128GB", "512GB")
      },
      @{
        name          = "Color"
        is_visual     = $true
        display_order = 1
        options       = @("Navy", "White")
      }
    )
    combinations = @(
      @{
        option_values    = @("128GB", "Navy")
        price_adjustment = 10000
        stock_quantity   = 6
        sku              = "SMOKE-TWO-$runId-UPD-128-NVY"
        is_active        = $true
      },
      @{
        option_values    = @("512GB", "White")
        price_adjustment = 50000
        stock_quantity   = 2
        sku              = "SMOKE-TWO-$runId-UPD-512-WHT"
        is_active        = $true
      }
    )
  }
  Assert-True ($twoTypeUpdate.success -eq $true) "two-type product update should succeed"
  $twoTypeAfterUpdate = Get-ProductData -ProductId $twoTypeProduct.id -Headers $headers
  $updatedOptions = @($twoTypeAfterUpdate.variant_types | ForEach-Object { $_.options } | ForEach-Object { $_.value })
  Assert-True ($updatedOptions.Contains("512GB")) "updated product should contain added option 512GB"
  Assert-True ($updatedOptions.Contains("White")) "updated product should contain added option White"
  Assert-True (-not $updatedOptions.Contains("Orange")) "updated product should remove option Orange"
  Assert-True ((Get-ItemCount $twoTypeAfterUpdate.combinations) -eq 2) "updated product should have two combinations"

  Write-Host "6. Image scenarios skipped"
  Write-Host "   Default image and variant image upload are intentionally skipped because image upload will be tested manually."

  Write-Host ""
  Write-Host "Admin product smoke test PASSED"
} finally {
  if (-not $KeepProducts) {
    foreach ($productId in $createdProductIds) {
      try {
        Invoke-JsonRequest -Method "DELETE" -Uri "$BaseUrl/admin/products/$productId" -Headers $headers | Out-Null
        Write-Host "Cleaned product $productId"
      } catch {
        Write-Warning "Failed to clean product ${productId}: $_"
      }
    }
  } else {
    Write-Host "Keeping smoke products:"
    $createdProductIds | ForEach-Object { Write-Host "  $_" }
  }
}
