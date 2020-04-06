set name=addon.xpi
rm %name%
zip -r %name% . -x "*.xpi" "*.bat" "*.psd" "*.md" "*.code-workspace" ".git\*" "*.gitignore"