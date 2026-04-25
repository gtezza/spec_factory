import os
import time
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('env/.env')

supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

def run_maintenance():
    print("=== Iniciando Tareas de Mantenimiento ===")
    
    # 1. Limpiar borradores muy antiguos (ej. > 30 días si hubiera created_at)
    # Por ahora solo listaremos registros sin embedding para re-procesar si fuera necesario
    print("Verificando registros sin vectores de búsqueda...")
    orphans = supabase.table("specifications").select("id, title").is_("embedding", "null").execute()
    
    if orphans.data:
        print(f"Se encontraron {len(orphans.data)} especificaciones sin vectores.")
        # Aquí se podría disparar un re-embedding, pero por ahora solo informamos
    else:
        print("Todos los registros tienen vectores de búsqueda.")

    # 2. Verificar integridad de perfiles
    print("Verificando integridad de perfiles...")
    profiles = supabase.table("profiles").select("id").execute()
    if not profiles.data:
        print("[ALERTA] No hay perfiles creados. El sistema podria fallar al guardar.")
    
    print("=== Mantenimiento Finalizado ===")

if __name__ == "__main__":
    run_maintenance()
