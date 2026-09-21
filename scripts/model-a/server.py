from __future__ import annotations

import importlib.util
import os
import sys
from http.server import ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8787
PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENDPOINT_FILE = PROJECT_ROOT / "api" / "model-a-screening.py"

os.chdir(PROJECT_ROOT)

spec = importlib.util.spec_from_file_location(
    "stuntspecula_model_a_endpoint",
    ENDPOINT_FILE,
)

if spec is None or spec.loader is None:
    raise RuntimeError("Model A endpoint tidak dapat dimuat.")

module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)

BaseHandler = module.handler


class LocalHandler(BaseHandler):
    def end_headers(self) -> None:
        origin = self.headers.get("Origin", "")

        if origin in {
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        }:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header(
                "Access-Control-Allow-Headers",
                "Content-Type, X-Age-Months",
            )
            self.send_header(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS",
            )

        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()


if __name__ == "__main__":
    print("StuntSpecula Model A V2.1 — Local Runtime")
    print(f"Endpoint : http://{HOST}:{PORT}")
    server = ThreadingHTTPServer((HOST, PORT), LocalHandler)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
