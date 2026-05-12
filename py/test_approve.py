import requests
import json

url = "http://localhost:5005/api/triage/approve"
payload = {
    "triage_id": "191e40a6-12d1-4700-aaea-f91ed1cf54f9",
    "approver_id": "admin",
    "comment": "Aprobado para prueba end-to-end",
    "project_name": "Test Conversión SDD"
}
headers = {'Content-Type': 'application/json'}

try:
    print("Enviando petición de aprobación...")
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
except Exception as e:
    print(f"Error: {e}")
