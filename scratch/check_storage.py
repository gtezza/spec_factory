import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL o SUPABASE_KEY no configurados.")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def check_and_create_bucket():
    try:
        # Listar buckets
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        print(f"Buckets actuales: {bucket_names}")
        
        if 'triage-samples' not in bucket_names:
            print("Creando bucket 'triage-samples'...")
            supabase.storage.create_bucket('triage-samples', options={'public': True})
            print("Bucket 'triage-samples' creado exitosamente.")
        else:
            print("El bucket 'triage-samples' ya existe.")
            
    except Exception as e:
        print(f"Error al gestionar el bucket: {e}")

if __name__ == "__main__":
    check_and_create_bucket()
