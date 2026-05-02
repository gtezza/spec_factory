import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

try:
    response = supabase.table("usuarios").select("*").execute()
    print("Usuarios encontrados:")
    for user in response.data:
        print(f"ID: {user['id']} | Email: {user['email']} | Pass: {user['password']} | Role: {user.get('role_name') or user.get('role')}")
except Exception as e:
    print(f"Error: {e}")
