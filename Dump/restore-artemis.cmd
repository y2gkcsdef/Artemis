@echo off
setlocal

set "DUMP_FILE=%~dp0artemis_init.dump"
set "PG_RESTORE="

if not exist "%DUMP_FILE%" (
  echo Could not find "%DUMP_FILE%".
  echo Make sure artemis_init.dump is in the same folder as this script.
  exit /b 1
)

where pg_restore.exe >nul 2>nul
if not errorlevel 1 (
  set "PG_RESTORE=pg_restore.exe"
)

if not defined PG_RESTORE (
  for /d %%D in ("%ProgramFiles%\PostgreSQL\*") do (
    if exist "%%~fD\bin\pg_restore.exe" set "PG_RESTORE=%%~fD\bin\pg_restore.exe"
  )
)

if not defined PG_RESTORE if defined ProgramFiles(x86) (
  for /d %%D in ("%ProgramFiles(x86)%\PostgreSQL\*") do (
    if exist "%%~fD\bin\pg_restore.exe" set "PG_RESTORE=%%~fD\bin\pg_restore.exe"
  )
)

if not defined PG_RESTORE (
  echo Could not find pg_restore.exe.
  echo Install PostgreSQL, or add the PostgreSQL bin folder to PATH.
  echo Example: C:\Program Files\PostgreSQL\18\bin
  exit /b 1
)

echo Using: "%PG_RESTORE%"
echo Restoring: "%DUMP_FILE%"
echo.
echo You will be prompted for the PostgreSQL password for user postgres.
echo This restore uses --clean and --create.
echo.

"%PG_RESTORE%" ^
  --host=localhost ^
  --port=5432 ^
  --username=postgres ^
  --dbname=postgres ^
  --clean ^
  --if-exists ^
  --create ^
  --no-owner ^
  --no-privileges ^
  "%DUMP_FILE%"

if errorlevel 1 (
  echo.
  echo Restore failed.
  exit /b 1
)

echo.
echo Restore complete.
