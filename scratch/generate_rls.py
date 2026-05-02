import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

sql_commands = [
    "ALTER TABLE statuses ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS \"Permitir lectura publica\" ON statuses;",
    "CREATE POLICY \"Permitir lectura publica\" ON statuses FOR SELECT TO anon USING (true);",
    
    "ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS \"Permitir lectura publica de sectores\" ON sectors;",
    "CREATE POLICY \"Permitir lectura publica de sectores\" ON sectors FOR SELECT TO anon USING (true);",
    
    "ALTER TABLE triage_requests ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS \"Permitir lectura publica de triage\" ON triage_requests;",
    "CREATE POLICY \"Permitir lectura publica de triage\" ON triage_requests FOR SELECT TO anon USING (true);",
    "DROP POLICY IF EXISTS \"Permitir insercion publica de triage\" ON triage_requests;",
    "CREATE POLICY \"Permitir insercion publica de triage\" ON triage_requests FOR INSERT TO anon WITH CHECK (true);"
]

for cmd in sql_commands:
    try:
        # Supabase Python client doesn't have a direct .query() but we can use RPC if available 
        # or execute via a helper function if defined. 
        # Since I don't have a direct 'execute_sql' RPC, I will try to use the mcp_supabase_query 
        # despite the certificate error, maybe it was transient or I can fix it by setting an env var.
        pass
    except Exception as e:
        print(f"Error executing {cmd}: {e}")

print("Las políticas RLS deben ser aplicadas manualmente en el dashboard de Supabase o mediante el editor SQL.")
print("Comandos a ejecutar:")
for cmd in sql_commands:
    print(cmd)
