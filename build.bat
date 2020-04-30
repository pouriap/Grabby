set name=addon.xpi
rm %name%
zip -r %name% . -x "*.xpi" "*.bat" "*.sh" "*.psd" "*.md" "*.code-workspace" "*.gitignore" ".git/" ".git/*" "_extras/" "_extras/*" "_Native Client/" "_Native Client/**/*"
cp "D:\Personal Folder\Pouria\My Documents\_Projects\JavaScript\Firefox Download Assist\_Native Client\win\app\host.js" "C:\Users\Pouria\AppData\Local\download.grab.pouriap\host.js"