import os
from supabase import create_client, Client
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash

load_dotenv(dotenv_path='env/.env')

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

def fix():
    # Insertar/Actualizar gtezza
    h2 = generate_password_hash("1234", method='scrypt')
    user_data = {
        "full_name": "Gerardo Tezza",
        "email": "gtezza@specfactory.com",
        "password": h2,
        "role": "aprovador",
        "sector": "Sistemas"
    }
    
    # Check if exists
    existing = supabase.table("usuarios").select("id").eq("email", user_data["email"]).execute()
    if existing.data:
        supabase.table("usuarios").update(user_data).eq("id", existing.data[0]["id"]).execute()
        print("Usuario gtezza actualizado.")
    else:
        supabase.table("usuarios").insert(user_data).execute()
        print("Usuario gtezza creado.")

    # Asegurar que admin también tenga el hash correcto (por si acaso)
    h1 = generate_password_hash("admin", method='scrypt')
    admin_data = {
        "full_name": "Administrador",
        "email": "admin@specfactory.com",
        "password": h1,
        "role": "admin"
    }
    existing_admin = supabase.table("usuarios").select("id").eq("email", admin_data["email"]).execute()
    if existing_admin.data:
        supabase.table("usuarios").update(admin_data).eq("id", existing_admin.data[0]["id"]).execute()
        print("Usuario admin actualizado.")

fix()
