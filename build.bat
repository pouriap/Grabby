set name=addon.xpi
rm %name%
zip -r %name% . -x "*.xpi" "*.bat" "*.sh" "*.psd" "*.md" "*.code-workspace" "*.gitignore" ".git/" ".git/*" "_extras/" "_extras/*"