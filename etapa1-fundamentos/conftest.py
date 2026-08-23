"""Configuración global de pytest: cargar variables de entorno desde .env."""
from pathlib import Path

from dotenv import load_dotenv

# Cargar .env en la raíz del proyecto
env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
