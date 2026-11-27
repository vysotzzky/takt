"""Otwiera lokalną, skompilowaną wersję Takt. Wymaga wyłącznie Pythona 3.8+."""
import hashlib
import mimetypes
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener

HOST, PORT = "127.0.0.1", 8785
ROOT = Path(__file__).resolve().parent / "aplikacja"
URL = "http://{}:{}".format(HOST, PORT)
MARKER = "/takt-wersja"


class TaktHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == MARKER:
            body = self.server.build_id
            self.send_response(200)
            self.send_header("Content-Type", "text/plain")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def list_directory(self, path):
        self.send_error(404)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()


def main():
    index = ROOT / "index.html"
    if not index.is_file():
        print("Rozpakuj caly ZIP i uruchom START_TAKT.cmd z rozpakowanego folderu.")
        return 1
    build_id = hashlib.sha256(index.read_bytes()).hexdigest().encode("ascii")
    mimetypes.add_type("text/javascript", ".js")
    mimetypes.add_type("text/css", ".css")
    handler = partial(TaktHandler, directory=str(ROOT))
    try:
        server = ThreadingHTTPServer((HOST, PORT), handler)
    except OSError:
        try:
            opener = build_opener(ProxyHandler({}))
            with opener.open(URL + MARKER, timeout=2) as response:
                same = response.read(65) == build_id
        except (URLError, OSError):
            same = False
        if same:
            print("Takt juz dziala. Otwieram aplikacje.")
            webbrowser.open(URL)
            return 0
        print("Port 8785 jest zajety. Zamknij poprzednia wersje Takt lub program uzywajacy portu.")
        return 1
    with server:
        server.build_id = build_id
        print("Takt dziala na tym komputerze: " + URL, flush=True)
        print("Zostaw to okno otwarte. Aby zatrzymac serwer, nacisnij Ctrl+C.", flush=True)
        webbrowser.open(URL)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
