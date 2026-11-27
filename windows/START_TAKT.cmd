@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 goto python
py -3 -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>nul
if errorlevel 1 goto python
py -3 uruchom.py
goto result
:python
python -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>nul
if errorlevel 1 goto missing
python uruchom.py
:result
if errorlevel 1 pause
exit /b
:missing
echo Zainstaluj Python 3 dla Windows z python.org, zaznacz Add Python to PATH i ponownie uruchom ten plik.
pause
