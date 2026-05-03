import requests
import json

def test_analyze_vibe():
    url = "http://localhost:5005/api/analyze-vibe"
    payload = {
        "text": "Quiero crear un sistema de gestión de inventarios para una ferretería que use códigos QR y se sincronice con una base de datos en la nube para alertas de stock bajo."
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        result = response.json()
        
        print("\n--- RESULTADO DEL ANÁLISIS IA ---")
        print(f"Objetivo: {result.get('goal')}")
        print(f"Criticidad: {result.get('criticality')}")
        print(f"ROI: {result.get('roi')}")
        
        print("\nPreguntas de Clarificación:")
        for q in result.get('questions', []):
            print(f"- {q}")
            
        print("\nSugerencias de Mejora:")
        for s in result.get('suggestions', []):
            print(f"- {s}")
            
        print("\nTérminos Detectados:")
        for t in result.get('terms', []):
            print(f"- {t['term']} ({t['layer']}): {t['definition']}")
            
    except Exception as e:
        print(f"Error en la prueba: {e}")

if __name__ == "__main__":
    test_analyze_vibe()
