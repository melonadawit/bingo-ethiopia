$botToken = "8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE"
$webAppUrl = "https://93b633a5.bingo-ethiopia.pages.dev"

# Try setChatMenuButton instead
$body = @{
    menu_button = @{
        type = "web_app"
        text = "Play Bingo"
        web_app = @{
            url = $webAppUrl
        }
    }
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$botToken/setChatMenuButton" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Menu button set successfully!"
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ Error: $_"
    Write-Host "Response: $($_.ErrorDetails.Message)"
}
