@echo off
setlocal
REM 进入 VS2022 BuildTools 的 x86 环境，用于构建 32 位原生模块
call "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvarsall.bat" x86
set CL=/std:c++20
set GYP_MSVS_VERSION=2022
cd /d "F:\Code\Project\10DAMO\ffo-auto-script"
REM 重建 winax，明确 Electron 版本与架构，避免 ABI/头文件不匹配
npx @electron/rebuild -f -w winax --arch=ia32 --version=13.6.9
endlocal