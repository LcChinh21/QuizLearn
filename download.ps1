$c = @(
    "https://media3.giphy.com/media/11ISwbgCxEzMyY/giphy.gif",
    "https://media1.giphy.com/media/nxxZv208h42EubyS3i/giphy.gif",
    "https://media2.giphy.com/media/26hirEPeos6yGJZok/giphy.gif",
    "https://media4.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
    "https://media4.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif"
)
$w = @(
    "https://media1.giphy.com/media/8UGoOaR1lA1uaAN892/giphy.gif",
    "https://media2.giphy.com/media/l41Ym49ppcDP6iY3C/giphy.gif",
    "https://media3.giphy.com/media/xT5LMzIK1AdZJ4cYW4/giphy.gif",
    "https://media4.giphy.com/media/12Msh5VHHsBIfS/giphy.gif",
    "https://media0.giphy.com/media/kC2cRqEt8o41RoEzN5/giphy.gif"
)

Remove-Item -Force "memes/correct/*.gif" -ErrorAction SilentlyContinue
Remove-Item -Force "memes/incorrect/*.gif" -ErrorAction SilentlyContinue

$i = 1
foreach ($url in $c) {
    curl.exe -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" $url -o "memes/correct/${i}.gif"
    $i++
}

$i = 1
foreach ($url in $w) {
    curl.exe -sL -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" $url -o "memes/incorrect/${i}.gif"
    $i++
}

Get-ChildItem -Path "memes/correct", "memes/incorrect" | Select-Object Name, Length | Format-Table -AutoSize
