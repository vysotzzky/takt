# Takt

Aplikacja do rejestracji czasu pracy z Supabase Auth i PostgreSQL. Docelowo pracownik potwierdza początek i koniec pracy zdjęciem i lokalizacją, a administrator przegląda historię i eksportuje godziny.

Repozytorium zawiera schemat danych z migracją, role i polityki RLS, regułę odczytu prywatnych zdjęć, testy izolacji danych i ekran logowania. Rejestrowanie zmian, zapisywanie zdjęć, historia, PWA i panel administratora są kolejnymi zadaniami.

- [Model bazy i diagram](docs/model.md)
- [Demonstracja logowania, makiety ekranów i lista operacji](docs/widoki-i-operacje.md)
- [Plan prac i backlog](docs/plan.md)

## Uruchomienie

### Projekt Supabase

1. Użyj projektu testowego `takt-dev`, w którym pierwsza migracja jest już wgrana, lub utwórz własny projekt i zastosuj `supabase/migrations/20261125083257_initial_takt.sql` w jego **SQL Editor**.
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

Otwórz lokalny adres wypisany w konsoli, zwykle `http://localhost:5173`. Zaloguj się kontem testowym i sprawdź wyświetlane imię oraz rolę.

## Sprawdzenie zmian

```powershell
npm test
npm run build
```

Testy uruchamiają migrację w lokalnym PostgreSQL przez PGlite z odpowiednikami tabel Auth i Storage. Sprawdzają RLS, prywatność zdjęć, blokadę konta oraz unikatowość otwartej zmiany i powtórzonego potwierdzenia. Wynik logowania obu ról do projektu testowego i zrzuty ekranów opisano w [demonstracji](docs/widoki-i-operacje.md). W tym repozytorium używamy wyłącznie danych testowych.
