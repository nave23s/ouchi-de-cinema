# Claude Code statusline — git branch display
$branch = git branch --show-current 2>$null
if ($branch) {
    "⎇ $branch"
} else {
    "⎇ ---"
}
