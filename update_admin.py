import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("env/.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

res = supabase.table("usuarios").update({"full_name": "Admin"}).eq("email", "admin@specfactory.com").execute()
print("Updated admin user:", res.data)
