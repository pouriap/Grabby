@echo off

pushd "%~dp0"
CD app

IF "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
  FOR /f %%i in ('..\node\x64\node.exe -e "process.stdout.write(require('./config.js').id)"') do SET id=%%i
) ELSE (
  FOR /f %%i in ('..\node\x86\node.exe -e "process.stdout.write(require('./config.js').id)"') do SET id=%%i
)

echo sss%id%

echo .. Deleting Chrome Registry
REG DELETE "HKCU\Software\Google\Chrome\NativeMessagingHosts\%id%" /f

echo .. Deleting Firefox Registry
for %%f in ("%LocalAPPData%") do SET SHORT_PATH=%%~sf
REG DELETE "HKCU\SOFTWARE\Mozilla\NativeMessagingHosts\%id%" /f

echo .. Deleting %id%
RMDIR /Q /S "%LocalAPPData%\%id%"

echo.
echo ^>^>^> Native Client is removed ^<^<^<
echo.
pause

