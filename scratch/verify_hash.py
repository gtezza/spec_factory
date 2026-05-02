from werkzeug.security import generate_password_hash, check_password_hash

p1 = "admin"
h1 = generate_password_hash(p1, method='scrypt')
print(f"Password: {p1} -> Hash: {h1}")

p2 = "1234"
h2 = generate_password_hash(p2, method='scrypt')
print(f"Password: {p2} -> Hash: {h2}")

# Verificamos el hash que encontramos en la DB
db_hash = "scrypt:32768:8:1$6CMB9yeNz2P6JSOz$cd6ab87ab4af932cd7f0991b71a2aed0d856ae51ff5182f3284f1b6134445b835ca1a8adbaf8ce5665dc03fd27f8a9a8e1dd68a885990943c9c6e73f7ac821a1"
if check_password_hash(db_hash, "admin"):
    print("El hash de la DB coincide con 'admin'")
else:
    print("El hash de la DB NO coincide con 'admin'")
