set name=addon.xpi
rm %name%

zip -r %name% . -x "*.xpi" "*.bat" "*.sh" "*.psd" "*.md" "*.code-workspace" "*.gitignore" ".git/" ".git/*" "_extras/" "_extras/*" "_Native Client/" "_Native Client/**/*" "icons/icon.png" "icons/icon.ico"
cp "_Native Client\win\app\host.js" "D:\Program Files\Download Grab Native Client\host.js"
cp %name% "D:\shared\%name%"