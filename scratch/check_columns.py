import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

try:
    # Query to get column names (PostgreSQL)
    res = supabase.rpc("get_columns", {"table_name": "usuarios"}).execute()
    print(res.data)
except:
    # Fallback: select one row
    res = supabase.table("usuarios").select("*").limit(1).execute()
    if res.data:
        print(f"Columnas detectadas: {list(res.data[0].keys())}")
    else:
        print("No se pudo detectar columnas.")
