@echo off
setlocal
call "D:\Program Files\Microsoft Visual Studio\18\Enterprise\VC\Auxiliary\Build\vcvarsall.bat" amd64
set CL=/std:c++20
set GYP_MSVS_VERSION=2022
cd /d "F:\Code\Project\10DAMO\ffo-auto-script"
npx electron-rebuild -f -w winax
endlocal