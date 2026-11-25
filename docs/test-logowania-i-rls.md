# Test logowania i uprawnień Takt

25 listopada 2026 r. sprawdzono aplikację z projektem testowym `takt-dev`. Utworzono dwa konta z fikcyjnymi danymi, po jednym dla każdej roli.

| Sprawdzenie | Wynik |
| --- | --- |
| Logowanie pracownika i administratora | Supabase Auth zalogował oba konta. Aplikacja pokazała właściwą nazwę i rolę po zalogowaniu i po odświeżeniu strony. |
| Odczyt profili przez API | Pracownik otrzymał jeden wiersz (własny). Administrator otrzymał oba profile. Zapytanie nie filtrowało po użytkowniku. |
| Dostęp do zmian i potwierdzeń | Dla dwóch tymczasowych zmian zapytanie jako pracownik zwróciło jedną zmianę i jedno potwierdzenie. Administrator odczytał po dwa. Po sprawdzeniu wycofano transakcję. |
| Wylogowanie | Po wylogowaniu i odświeżeniu strony oba konta wróciły do formularza logowania. |
| Testy repozytorium i kompilacja | `npm test` i `npm run build` zakończyły się powodzeniem. |

Test interfejsu uruchomiono w Chromium z oknem 420 × 700. Żądania z przeglądarki przekazano przez HTTPS do działającego projektu Supabase. Osobno sprawdzono logowanie, odczyt profili i wylogowanie bezpośrednio przez API.

Aby powtórzyć porównanie, zaloguj się osobno na każdym koncie. W panelu Supabase otwórz `profiles` w Table Editor i wybierz podgląd jako dany użytkownik. Pracownik powinien widzieć własny wiersz, a administrator oba wiersze.
