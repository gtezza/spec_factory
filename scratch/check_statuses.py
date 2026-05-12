import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

result = supabase.table('statuses').select('*').execute()
print('Statuses found:', len(result.data))
for row in result.data:
    print(row)
