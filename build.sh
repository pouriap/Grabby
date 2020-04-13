DEBUG=1

if [ $DEBUG -eq 0 ]
	then
		#remove all console.logs
		find . -name "*.js" -exec sed -E -i 's/console\.log\(.*\);?$//g' {} \; -exec sed -E -i 's/DEBUG = true/DEBUG = false/g' {} \;
fi

name=addon.xpi
rm $name
zip -r $name . -x "*.xpi" "*.bat" "*.sh" "*.psd" "*.md" "*.code-workspace" ".git\*" "*.gitignore" "icons/icon.png" "icons/attribution.txt" "icons/*.bat"
