import requests
import ssl
import json
import re

# 1. Login to Keycloak and get token for tadeogala7
session = requests.Session()
login_url = "https://dacs-3-dswy.onrender.com/auth/realms/apexpredict/protocol/openid-connect/auth?client_id=apexpredict-web&redirect_uri=https://dacs-nine.vercel.app/&response_mode=fragment&response_type=code&scope=openid&code_challenge=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk&code_challenge_method=S256"

r = session.get(login_url)
match = re.search(r'action="([^"]+)"', r.text)
if not match:
    print("Could not find login form action!")
    exit(1)

post_url = match.group(1).replace("&amp;", "&")
r2 = session.post(post_url, data={
    "username": "tadeogala7",
    "password": "password123", # or test user credentials
    "credentialId": ""
}, allow_redirects=False)

print(f"Login redirect status: {r2.status_code}")
location = r2.headers.get("location", "")
print(f"Redirect location: {location}")

if "code=" not in location:
    # Try with marudri58 or user
    print("Trying with user martin...")
    r = session.get(login_url)
    post_url = re.search(r'action="([^"]+)"', r.text).group(1).replace("&amp;", "&")
    r2 = session.post(post_url, data={
        "username": "martin",
        "password": "password123",
        "credentialId": ""
    }, allow_redirects=False)
    location = r2.headers.get("location", "")
    print(f"Martin login redirect: {location}")

# If we have direct token endpoint via password grant or admin:
# Let's check token endpoint directly with client credentials or direct grant:
token_url = "https://dacs-3-dswy.onrender.com/auth/realms/apexpredict/protocol/openid-connect/token"
token_res = requests.post(token_url, data={
    "client_id": "apexpredict-web",
    "grant_type": "password",
    "username": "tadeogala7",
    "password": "password123"
})
print("Direct token grant status:", token_res.status_code, token_res.text[:200])
