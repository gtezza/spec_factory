import os
from supabase import create_client
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv('env/.env')

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

def populate():
    print("Iniciando población de base de datos...")
    
    # 1. Insertar Roles según SDD
    roles = [
        {"name": "Admin"},
        {"name": "Creador"},
        {"name": "Aprovador"},
        {"name": "Visor"}
    ]
    for r in roles:
        supabase.table("roles").upsert(r, on_conflict="name").execute()
    print("[OK] Roles insertados/actualizados.")

    # 2. Insertar Sectores
    sectors = [
        {"name": "Tecnología"},
        {"name": "Legal"},
        {"name": "Salud"},
        {"name": "Finanzas"},
        {"name": "Operaciones"}
    ]
    for s in sectors:
        supabase.table("sectors").upsert(s, on_conflict="name").execute()
    print("[OK] Sectores insertados/actualizados.")

    # 3. Configuración Usuario Admin
    admin_email = "admin@specfactory.com"
    hashed_pass = generate_password_hash("admin", method='scrypt')
    
    # Verificar si ya existe
    existing = supabase.table("usuarios").select("id").eq("email", admin_email).execute()
    
    if not existing.data:
        admin_user = {
            "full_name": "Administrador Sistema",
            "email": admin_email,
            "password": hashed_pass,
            "role": "Admin",
            "sector": "Operaciones"
        }
        try:
            supabase.table("usuarios").insert(admin_user).execute()
            print("[OK] Usuario Admin creado (admin@specfactory.com / admin).")
        except Exception as e:
            print(f"[ERROR] No se pudo crear el admin: {e}")
            print("Asegúrate de ejecutar el script SQL primero para crear las tablas.")
    else:
        print(f"[SKIP] Usuario Admin ya existe.")

if __name__ == "__main__":
    populate()
