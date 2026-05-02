import os
from supabase import create_client, Client
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv(dotenv_path='env/.env')

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def fix():
    # 1. Obtener Roles
    roles_res = supabase.table("roles").select("*").execute()
    roles = {r['name']: r['id'] for r in roles_res.data}
    print(f"Roles encontrados: {roles}")

    if not roles:
        print("No se encontraron roles. ¿Se ejecutó el script SQL?")
        return

    # 2. Insertar/Actualizar gtezza
    h2 = generate_password_hash("1234", method='scrypt')
    user_data = {
        "full_name": "Gerardo Tezza",
        "email": "gtezza@specfactory.com",
        "password": h2,
        "role": "aprovador",
        "role_id": roles.get("aprovador")
    }
    
    # Check if exists
    existing = supabase.table("usuarios").select("id").eq("email", user_data["email"]).execute()
    if existing.data:
        supabase.table("usuarios").update(user_data).eq("id", existing.data[0]["id"]).execute()
        print("Usuario gtezza actualizado.")
    else:
        supabase.table("usuarios").insert(user_data).execute()
        print("Usuario gtezza creado.")

fix()
