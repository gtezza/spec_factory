import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

supabase: Client = create_client(url, key)

def check_users():
    try:
        result = supabase.table("usuarios").select("*").execute()
        print(f"Usuarios encontrados: {len(result.data)}")
        for u in result.data:
            print(f"- ID: {u['id']} | Email: {u['email']} | Role: {u['role']}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_users()
