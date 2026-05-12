import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

# Asegurar que el directorio de ejecución es correcto y cargar variables de entorno
load_dotenv(dotenv_path='env/.env')

supabase_url = os.getenv("SUPABASE_URL")
supabase_service_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_service_key:
    print("[ERROR] No se encontraron las variables de entorno de Supabase en 'env/.env'.")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_service_key)

def clean_empty_specifications():
    try:
        print("Consultando especificaciones en Supabase...")
        result = supabase.table("specifications").select("id, title, status, markdown").execute()
        
        empty_ids = []
        for row in result.data:
            md = row.get("markdown")
            title = row.get("title")
            if not title or title.strip() == "" or md is None or str(md).strip() == "":
                empty_ids.append(row.get("id"))
                
        if not empty_ids:
            print("[OK] No se encontraron especificaciones vacías (sin nombre de proyecto) en la base de datos.")
            return
            
        print(f"Se encontraron {len(empty_ids)} especificaciones vacías.")
        print("Eliminando registros vacíos...")
        
        for spec_id in empty_ids:
            supabase.table("specifications").delete().eq("id", spec_id).execute()
            print(f" - Registro {spec_id} eliminado.")
            
        print(f"[OK] Proceso finalizado. Se eliminaron {len(empty_ids)} registros vacíos.")
        
    except Exception as e:
        print(f"[ERROR] Ocurrió un error al limpiar la base de datos: {e}")

if __name__ == "__main__":
    clean_empty_specifications()
