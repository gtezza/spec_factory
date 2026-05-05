import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv(dotenv_path='env/.env')

def test_groq():
    api_key = os.getenv("GROQ_API_KEY")
    print(f"Testing Groq with key starting with: {api_key[:10]}...")
    client = Groq(api_key=api_key)
    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "user", "content": "Hola, responde con 'OK' si recibes esto."}
            ],
            model="llama-3.3-70b-versatile",
        )
        print("Response from Groq:", chat_completion.choices[0].message.content)
    except Exception as e:
        print("Error connecting to Groq:", str(e))

if __name__ == "__main__":
    test_groq()
