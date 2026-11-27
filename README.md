# Takt

Pracownik loguje się, rozpoczyna i kończy zmianę. Przy każdej z tych czynności robi zdjęcie i pobiera lokalizację z dokładnością w metrach. Pulpit pokazuje status, licznik, godziny w strefie Europe/Warsaw i link do Google Maps. Początek i koniec zapisują się w PostgreSQL, a zdjęcia w prywatnym Supabase Storage.

Wersja testowa obejmuje pierwsze dwa punkty tygodnia 2. Konto administratora ma uprawnienia odczytu danych zespołu przez RLS. Panel historii, eksport CSV, PWA i trwała obsługa pracy bez sieci są w planie.

- [Model bazy i diagram](docs/model.md)
- [Demonstracja logowania, makiety ekranów i lista operacji](docs/widoki-i-operacje.md)
- [Plan prac i backlog](docs/plan.md)

## Uruchomienie

### Gotowa paczka na Windows

Rozpakuj przekazany ZIP i uruchom `Takt/START_TAKT.cmd`. Potrzebujesz Pythona 3.8 lub nowszego, internetu, kamery i włączonej lokalizacji. Strona otworzy się na tym komputerze pod adresem `http://127.0.0.1:8785`. Plik startowy korzysta z gotowej kompilacji. Dane kont testowych przekazano osobno. Aby wyłączyć serwer, naciśnij Ctrl+C w jego oknie. [Instrukcja obsługi wersji na komputer](windows/INSTRUKCJA.txt)

### Projekt Supabase

1. Użyj projektu testowego `takt-dev`, w którym zastosowano obie migracje, lub zastosuj pliki SQL z katalogu `supabase/migrations/` w swoim projekcie w kolejności nazw.
2. W ustawieniach **Authentication** zostaw włączone logowanie e-mailem i hasłem oraz wyłącz otwartą rejestrację użytkowników.
3. W **Authentication → Users** utwórz dwa konta testowe. Użyj adresów e-mail pod swoją kontrolą i ustaw hasła w panelu. Skopiuj UUID obu kont.
4. W **SQL Editor** dodaj profile, podstawiając UUID swoich kont testowych.

```sql
insert into public.profiles (id, display_name, role) values
  ('UUID_KONTA_PRACOWNIKA', 'Pracownik testowy', 'employee'),
  ('UUID_KONTA_ADMINA', 'Administrator testowy', 'admin');
```

Supabase Auth obsługuje sesje i hasła. Profilu i roli nie da się samodzielnie zapisać z poziomu przeglądarki. Migrację wykonuje się tylko raz. Przy późniejszych zmianach schematu używaj kolejnych plików migracji.

### Aplikacja webowa

Wymagany jest Node.js 22.12 lub nowszy. W katalogu projektu na Windowsie uruchom PowerShell:

```powershell
npm ci
Copy-Item .env.example .env.local
```

W `.env.local` uzupełnij `VITE_SUPABASE_URL` i `VITE_SUPABASE_PUBLISHABLE_KEY` z panelu projektu. Przeglądarka korzysta z klucza `sb_publishable_…`. Zmienne z prefiksem `VITE_` są częścią kodu klienta, więc nie umieszczaj tam klucza `service_role`, `sb_secret_…` ani hasła bazy.

```powershell
npm run dev
```

Otwórz lokalny adres wypisany w konsoli, zwykle `http://localhost:5173`. Zaloguj się kontem testowym pracownika. Kliknij **Rozpocznij zmianę**, zrób zdjęcie obiektu testowego, pobierz lokalizację i zapisz potwierdzenie. Po zakończeniu zmiany jej czas i oba miejsca będą widoczne na pulpicie.

## Sprawdzenie zmian

```powershell
npm test
npm run build
```

Testy uruchamiają migrację w lokalnym PostgreSQL przez PGlite z odpowiednikami tabel Auth i Storage. Sprawdzają RLS, prywatność zdjęć, blokadę konta oraz unikatowość otwartej zmiany i powtórzonego potwierdzenia. Wynik logowania obu ról do projektu testowego i zrzuty ekranów opisano w [demonstracji](docs/widoki-i-operacje.md). W tym repozytorium używamy wyłącznie danych testowych.


Aby samodzielnie odtworzyć paczkę po `npm run build`, skopiuj zawartość katalogu `dist` do `windows/aplikacja` i otwórz `windows/START_TAKT.cmd`.
