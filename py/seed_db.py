import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('env/.env')

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

def populate():
    print("Iniciando población de base de datos...")
    
    # 1. Insertar Roles
    roles = [
        {"name": "Admin"},
        {"name": "Author"},
        {"name": "Approver"}
    ]
    for r in roles:
        supabase.table("roles").upsert(r, on_conflict="name").execute()
    print("[OK] Roles insertados/actualizados.")

    # 2. Insertar Sectores
    sectors = [
        {"name": "Tecnología"},
        {"name": "Legal"},
        {"name": "Salud"},
        {"name": "Finanzas"}
    ]
    for s in sectors:
        supabase.table("sectors").upsert(s, on_conflict="name").execute()
    print("[OK] Sectores insertados/actualizados.")

    # 3. Obtener IDs para el perfil
    author_role = supabase.table("roles").select("id").eq("name", "Author").single().execute().data
    tech_sector = supabase.table("sectors").select("id").eq("name", "Tecnología").single().execute().data

    # 4. Insertar Perfil de Autor por defecto
    if author_role and tech_sector:
        profile = {
            "full_name": "Analista Spec Factory",
            "role_id": author_role['id'],
            "sector_id": tech_sector['id']
        }
        supabase.table("profiles").upsert(profile, on_conflict="full_name").execute()
        print("[OK] Perfil de autor creado.")

if __name__ == "__main__":
    populate()
