import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

result = supabase.table('triage_requests').select('*, statuses(*)').execute()
print('Triage requests found:', len(result.data))
for row in result.data:
    print(f"ID: {row.get('id')}")
    print(f"Request ID: {row.get('request_id')}")
    print(f"Idea: {row.get('idea')}")
    print(f"Status Name: {row.get('statuses', {}).get('name') if row.get('statuses') else 'No status'}")
    print(f"Creator ID: {row.get('creator_id')}")
    print(f"Approver ID: {row.get('approver_id')}")
    print(f"Created At: {row.get('created_at')}")
    print("-" * 50)
