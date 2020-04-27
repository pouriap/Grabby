set name=addon.xpi
rm %name%
zip -r %name% . -x "*.xpi" "*.bat" "*.sh" "*.psd" "*.md" "*.code-workspace" "*.gitignore" ".git/" ".git/*" "extras/" "extras/*"