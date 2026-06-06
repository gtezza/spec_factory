import requests
import json

url = "http://localhost:5005/api/triage"
payload = {
    "idea": "Crear una hoja en el excel subido por país colocar una columna para la categoría de los productos...",
    "request_id": "TEC-12345",
    "creator_id": "c5e66319-fe7e-449f-8307-b1acba5daa50",
    "sector_id": "ad274fb8-041e-4abe-8530-1f7d90a2d2f7", # Tecnología
    "status_id": "272739de-4051-43e6-b0a6-338ad70ccddf", # PENDIENTE APROBACION
    "criticality": "Media",
    "objective": "Objetivo de prueba",
    "benefits": "Beneficios de prueba",
    "roi": "100%",
    "approver_id": "272dce78-860d-49c5-a594-645eda045a3e",
    "sample_files": []
}

headers = {'Content-Type': 'application/json'}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
