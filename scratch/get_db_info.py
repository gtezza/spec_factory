import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

users = supabase.table('usuarios').select('id, email, role').limit(5).execute()
print("Usuarios:")
for u in users.data:
    print(u)

sectors = supabase.table('sectors').select('id, name').limit(5).execute()
print("\nSectores:")
for s in sectors.data:
    print(s)
