import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv("env/.env")

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

# Obtener el ID del estado 'Borrador' o 'BORRADOR'
status_res = supabase.table("statuses").select("id, name").execute()
print("Statuses:", status_res.data)

borrador_id = None
if status_res.data:
    for s in status_res.data:
        if s['name'].upper() == 'BORRADOR':
            borrador_id = s['id']
            break

# Consultar todas las ideas
res_all = supabase.table("triage_requests").select("id, idea, status_id").execute()

# 1. Borrar todas las especificaciones
spec_res = supabase.table("specifications").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
print(f"Deleted all specs:", spec_res.data)

for req in res_all.data:
    req_id = req["id"]
    
    # 2. Actualizar estado a BORRADOR
    if borrador_id:
        update_res = supabase.table("triage_requests").update({"status_id": borrador_id}).eq("id", req_id).execute()
        print(f"Updated triage request {req_id} to borrador:", update_res.data)
    
