# Widoki i operacje aplikacji

## Makieta widoków

| Widok | Zawartość i działania |
| --- | --- |
| Logowanie | E-mail, hasło, przycisk logowania, komunikat błędu. Po zalogowaniu widoczne są nazwa i rola z profilu. |
| Pulpit pracownika | Status „Poza pracą” lub „W pracy”, licznik od rozpoczęcia zmiany i główny przycisk rozpoczęcia albo zakończenia. |
| Potwierdzenie | Podgląd zdjęcia, położenie i dokładność, przycisk zapisu. W razie przerwanego połączenia możliwość ponowienia dla tego samego identyfikatora. |
| Historia | Miesiąc, lista zmian, szczegóły zdjęć i lokalizacji, link do Google Maps i eksport CSV. |
| Zespół | Wyszukiwanie, filtr aktywności, edycja konta, blokada, przywrócenie i reset dostępu. |

Na telefonie główny przycisk zmiany jest w zasięgu kciuka. Historia i zarządzanie zespołem mieszczą się w oddzielnych widokach dostępnych z nawigacji.

## Operacje

| Operacja | Interfejs | Stan |
| --- | --- | --- |
| Logowanie i wylogowanie | Supabase Auth, e-mail i hasło | Zaimplementowane w aplikacji, wymaga podłączenia projektu |
| Profil użytkownika | Odczyt `profiles` z Supabase Data API | Zaimplementowane |
| Rejestracja zdarzenia | Planowana funkcja serwerowa, żądanie z `request_id`, typem, zdjęciem JPEG i pozycją | Tydzień 2 |
| Historia i zdjęcia | Data API z RLS oraz odczyt z prywatnego Storage | Tydzień 3 |
| Eksport godzin | Raport dla wybranego miesiąca i zakresu pracowników z bieżącymi uprawnieniami | Tydzień 3 |
| Zarządzanie użytkownikami | Funkcja serwerowa dla aktywnego administratora, wykorzystująca Supabase Auth Admin | Tydzień 3 |

### Zapis zmiany

Serwer zweryfikuje sesję, aktywność konta, dane lokalizacji i zdjęcie. Po przesłaniu pliku do Storage zapisze zmianę i potwierdzenie w jednej transakcji Postgresa. Ponowienie użyje tego samego `request_id` i ścieżki pliku. Storage działa osobno od transakcji SQL, więc implementacja musi obsłużyć sprzątanie pliku po nieudanym zapisie metadanych.
