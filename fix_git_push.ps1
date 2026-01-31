# 1. Delete the file with the secret
if (Test-Path "server\quick_test.js") { Remove-Item "server\quick_test.js" -Force }
if (Test-Path "server\test_groq_direct.js") { Remove-Item "server\test_groq_direct.js" -Force }

# 2. Update git to stop tracking it
git rm --cached server/quick_test.js
git rm --cached server/test_groq_direct.js

# 3. Amend the commit to remove it from history completely
git commit --amend -m "Aurem v1.0 Release" --allow-empty

# 4. Rename branch to main (if it's master)
git branch -M main

# 5. Push to GitHub
git push -u origin main --force
