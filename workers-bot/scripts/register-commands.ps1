$botToken = "8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE"
$url = "https://api.telegram.org/bot$botToken/setMyCommands"

$commands = @(
    @{command="start"; description="Start the bot"},
    @{command="tournament"; description="View tournaments"},
    @{command="events"; description="View events"},
    @{command="referral"; description="Referral program"},
    @{command="deposit"; description="Deposit money"},
    @{command="balance"; description="Check balance"},
    @{command="withdraw"; description="Withdraw money"},
    @{command="daily_bonus"; description="Daily bonus"},
    @{command="my_stats"; description="View statistics"},
    @{command="instruction"; description="Game instructions"},
    @{command="transactions"; description="Transaction history"},
    @{command="support"; description="Contact support"}
)

$body = @{commands = $commands} | ConvertTo-Json -Depth 10

$response = Invoke-WebRequest -Uri $url -Method Post -Body $body -ContentType "application/json"
$response.Content | ConvertFrom-Json | ConvertTo-Json
