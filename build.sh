DEBUG=true

name=addon.xpi
rm $name
zip -r $name . -x "*.xpi" "*.bat" "*.sh" "*.psd" "*.md" "*.code-workspace" ".git\*" "*.gitignore" "icons/icon.png" "icons/attribution.txt" "icons/*.bat"
