@echo off
set /P lobby=Podaj lobby:
:mainloop
set /P ile=Podaj ilosc osob:
for /L %%i in (1,1,%ile%) do (
    start "" "http://localhost:3000/lobby?room=%lobby%"
)
set /P koniec="Zakonczyc? (t)"
if /I "%koniec%"=="t" (
    echo Script zakończony.
) else (
    goto mainloop
)
pause