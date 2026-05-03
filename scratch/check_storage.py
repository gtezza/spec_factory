import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('env/.env')

url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_KEY')
supabase = create_client(url, key)

def check_bucket():
    print("Verificando buckets...")
    try:
        buckets = supabase.storage.list_buckets()
        for b in buckets:
            print(f"Bucket: {b.name}, Public: {b.public}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_bucket()
