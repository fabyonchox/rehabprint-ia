"""
RehabPrint IA — Sincronizador Google Sheets
Lee el Sheet y exporta los datos a live_data.json para que la app web los use.

USO:
  python sync_sheets.py

REQUISITOS:
  python -m pip install google-auth google-auth-httplib2 google-api-python-client
"""

import json, os, sys
from datetime import datetime

# Asegurar codificación UTF-8 para evitar errores de impresión en Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# ─── CONFIGURACIÓN ─────────────────────────────────────
# Pon el ID de tu Google Sheet aquí (está en la URL del sheet)
# Ejemplo: https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
SHEET_ID = "1Gd-M3J_kRd0M6aXBTi4LivVAXWrLMZ9JWluWxkX6Gcg"

# Nombre de la hoja (pestaña)
SHEET_NAME = "Respuestas de formulario 1"

# Ruta al JSON de credenciales (debe estar en la misma carpeta)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def find_credentials():
    """Busca el archivo JSON de credenciales en la carpeta del proyecto o en variables de entorno."""
    # 1. Intentar leer de la variable de entorno GOOGLE_CREDENTIALS (usada en GitHub Actions)
    env_creds = os.environ.get("GOOGLE_CREDENTIALS")
    if env_creds and env_creds.strip():
        try:
            data = json.loads(env_creds)
            if data.get("type") == "service_account":
                creds_path = os.path.join(SCRIPT_DIR, "credentials.json")
                with open(creds_path, "w", encoding="utf-8") as fh:
                    json.dump(data, fh)
                print(f"✅ Credenciales restauradas desde variable de entorno GOOGLE_CREDENTIALS")
                print(f"   Email de servicio: {data.get('client_email')}")
                return creds_path, data.get("client_email")
        except Exception as e:
            print(f"⚠️ Error al parsear GOOGLE_CREDENTIALS env var: {e}")

    # 2. Buscar archivo .json local
    for f in os.listdir(SCRIPT_DIR):
        if f.endswith(".json") and f != "live_data.json":
            path = os.path.join(SCRIPT_DIR, f)
            try:
                with open(path, encoding="utf-8") as fh:
                    data = json.load(fh)
                if data.get("type") == "service_account":
                    print(f"✅ Credenciales encontradas: {f}")
                    print(f"   Email de servicio: {data.get('client_email')}")
                    return path, data.get("client_email")
            except:
                pass
    return None, None

def sync():
    creds_path, client_email = find_credentials()
    if not creds_path:
        print("❌ No se encontró el archivo JSON de credenciales en la carpeta.")
        print("   Asegúrate de que el archivo .json de la cuenta de servicio esté aquí.")
        sys.exit(1)

    print(f"\n🔗 Conectando a Google Sheets...")
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        print("\n❌ Faltan librerías. Instálalas con:")
        print("   python -m pip install google-auth google-auth-httplib2 google-api-python-client")
        sys.exit(1)

    SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly"
    ]
    creds = service_account.Credentials.from_service_account_file(creds_path, scopes=SCOPES)
    service = build("sheets", "v4", credentials=creds)

    print(f"📊 Leyendo Sheet: {SHEET_ID}")
    result = service.spreadsheets().values().get(
        spreadsheetId=SHEET_ID,
        range=SHEET_NAME
    ).execute()

    rows = result.get("values", [])
    if not rows:
        print("❌ El Sheet está vacío o no se pudo leer.")
        sys.exit(1)

    headers = rows[0]
    records = []
    try:
        from agents_pipeline import agente_orquestador
        use_pipeline = True
    except ImportError:
        use_pipeline = False

    for i, row in enumerate(rows[1:], 1):
        # Rellenar celdas vacías
        padded = row + [""] * (len(headers) - len(row))
        record = {headers[j]: padded[j] for j in range(len(headers))}
        
        # Validar si la fila contiene datos reales (no vacía)
        has_content = any(str(val).strip() for k, val in record.items() if k != "_row_index")
        if not has_content:
            continue

        record["_row_index"] = len(records) + 1
        if use_pipeline:
            ai_data = agente_orquestador(record, len(records) + 1)
            record["_ai_agent_analysis"] = ai_data
        records.append(record)

    print(f"✅ {len(records)} solicitudes válidas leídas desde Google Sheets y procesadas por Agentes IA")

    # Exportar a JS (bypassea CORS de file:///)
    output = {
        "last_sync": datetime.now().isoformat(),
        "sheet_id": SHEET_ID,
        "total_records": len(records),
        "records": records
    }
    
    paths_js = [
        os.path.join(SCRIPT_DIR, "live_data.js"),
        os.path.join(SCRIPT_DIR, "rehabprint-ia", "live_data.js")
    ]
    paths_json = [
        os.path.join(SCRIPT_DIR, "live_data.json"),
        os.path.join(SCRIPT_DIR, "rehabprint-ia", "live_data.json")
    ]

    for p in paths_js:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            f.write("const liveData = ")
            json.dump(output, f, ensure_ascii=False, indent=2)
            f.write(";\n")

    for p in paths_json:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"💾 {len(records)} solicitudes exportadas exitosamente.")
    print(f"🕐 Hora de sincronización: {output['last_sync']}")
    return records

if __name__ == "__main__":
    print("=" * 50)
    print("  RehabPrint IA - Sincronizador Google Sheets")
    print("=" * 50)
    creds_path, email = find_credentials()
    if email:
        print(f"\n[INFO] Comparte tu Google Sheet con este email:")
        print(f"   👉 {email}")
        print(f"   (con permiso de LECTOR al menos)\n")
    sync()
    print("\n[OK] Sincronizacion completada.")
