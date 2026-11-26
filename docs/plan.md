# Plan prac

Postęp prac jest widoczny na [publicznej tablicy Takt](https://github.com/users/vysotzzky/projects/2/views/1) oraz w [zadaniach repozytorium](https://github.com/vysotzzky/takt/issues).

## Tydzień 1

- [x] Opublikować repozytorium, README, plik ignorowanych danych i instrukcję uruchomienia.
- [x] Utworzyć tablicę GitHub Projects i powiązać ją z repozytorium.
- [x] Wgrać migrację PostgreSQL z tabelami profili, zmian i potwierdzeń oraz prywatnym Storage.
- [x] Zaprojektować role i przetestować dostęp do danych przez RLS.
- [x] Przygotować makiety głównych widoków i listę operacji.
- [x] Skonfigurować konta testowe. Potwierdzić logowanie i wylogowanie obu ról oraz blokadę publicznej rejestracji.
- [x] Udostępnić [demonstrację i makiety](widoki-i-operacje.md), [diagram bazy](model.md) i [raport testów uprawnień](test-logowania-i-rls.md).

## Tydzień 2

- [ ] Dodać pulpit pracownika, start i koniec zmiany oraz licznik.
- [ ] Zaimplementować aparat, lokalizację, prywatny zapis zdjęć oraz ponowienia.
- [ ] Sprawdzić interfejs na telefonie i komputerze, dodać PWA i nagrać pełny przebieg zmiany.

## Tydzień 3

- [ ] Dodać historię, filtry i eksport CSV.
- [ ] Dodać operacje administratora: tworzenie i edycję kont, blokadę, przywrócenie i reset dostępu.
- [ ] Sprawdzić RLS i Storage na prawdziwym projekcie testowym oraz wykonać testy pełnego przepływu.
- [ ] Uzupełnić instrukcję, wykonać demo i zapisać dalsze zadania.

Każda większa zmiana ma własne Issue, branch i Pull Request. W opisie PR umieść wynik testu lub krótki zrzut z danymi testowymi; po połączeniu gałęzi zamknij Issue przez składnię `Closes #numer`. Podsumowanie tygodnia obejmuje gotowe funkcje, blokery i następny krok.
