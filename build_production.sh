#first prompt so that we don't mess everything up like that time :/
echo 'Are you sure you want to build for production?'
echo 'This will overwrite files. Make sure to commit before this.'
echo ''
select yn in "No" "Yes"; do
    case $yn in
        No ) exit;;
		Yes ) break;;
    esac
done

#remove all console.logs
#set debug to false
find . -name "*.js" -exec sed -E -i 's/console\.log\(.*\);?$//g' {} \; -exec sed -E -i 's/DEBUG = true/DEBUG = false/g' {} \;

name=addon.xpi
rm $name
zip -r $name . -x "*.xpi" "*.bat" "*.sh" "*.psd" "*.md" "*.code-workspace" "*.gitignore" ".git/" ".git/*" "_extras/" "_extras/*" "_Native Client/" "_Native Client/**/*" "icons/icon.png" "icons/icon.ico"

