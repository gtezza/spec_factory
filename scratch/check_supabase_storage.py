import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL or SUPABASE_KEY not found in env/.env")
    exit(1)

supabase: Client = create_client(url, key)

def check_storage():
    try:
        buckets = supabase.storage.list_buckets()
        print("Buckets encontrados:")
        found = False
        for b in buckets:
            print(f"- {b.name}")
            if b.name == 'triage-samples':
                found = True
        
        if found:
            print("\n[OK] El bucket 'triage-samples' existe.")
            # Intentar listar archivos
            files = supabase.storage.from_('triage-samples').list()
            print(f"Archivos en 'triage-samples': {len(files)}")
        else:
            print("\n[ERROR] El bucket 'triage-samples' NO existe.")
            print("Intentando crearlo...")
            try:
                supabase.storage.create_bucket('triage-samples', options={'public': True})
                print("[OK] Bucket creado exitosamente.")
            except Exception as e:
                print(f"[ERROR] No se pudo crear el bucket: {e}")

    except Exception as e:
        print(f"Error general: {e}")

if __name__ == "__main__":
    check_storage()
