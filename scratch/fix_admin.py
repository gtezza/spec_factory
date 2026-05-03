import os
from supabase import create_client
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv

load_dotenv('env/.env')

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

def fix_admin():
    print("Actualizando contraseña de admin...")
    admin_email = "admin@specfactory.com"
    new_pass = "1234"
    hashed_pass = generate_password_hash(new_pass, method='scrypt')
    
    try:
        # Verificar si existe
        existing = supabase.table("usuarios").select("id").eq("email", admin_email).execute()
        
        if existing.data:
            supabase.table("usuarios").update({"password": hashed_pass}).eq("email", admin_email).execute()
            print(f"[OK] Contraseña actualizada para {admin_email} a '1234'.")
        else:
            # Si no existe, lo creamos
            admin_user = {
                "full_name": "Administrador Sistema",
                "email": admin_email,
                "password": hashed_pass,
                "role": "admin",
                "sector": "Tecnología"
            }
            supabase.table("usuarios").insert(admin_user).execute()
            print(f"[OK] Usuario Admin creado con contraseña '1234'.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_admin()
