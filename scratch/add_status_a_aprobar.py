import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("env/.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

# Verificar si el estado "A APROBAR" ya existe
status_res = supabase.table("statuses").select("id, name").execute()
print("Estados actuales:", status_res.data)

exists = False
for s in status_res.data:
    if s['name'].upper() == 'A APROBAR':
        exists = True
        print("El estado 'A APROBAR' ya existe con ID:", s['id'])
        break

if not exists:
    insert_res = supabase.table("statuses").insert({
        "name": "A APROBAR",
        "color": "#3b82f6",
        "is_initial": False
    }).execute()
    print("Estado 'A APROBAR' creado con éxito:", insert_res.data)
else:
    print("No se requiere inserción.")
