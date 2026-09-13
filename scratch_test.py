import base64
import json
import urllib.request
import sys

image_path = r"C:\Code\carbon-loop-app\TestEVReg.png"

try:
    with open(image_path, "rb") as f:
        image_data = f.read()
except FileNotFoundError:
    print(f"Error: Could not find {image_path}")
    sys.exit(1)

base64_img = base64.b64encode(image_data).decode('utf-8')
data_uri = f"data:image/png;base64,{base64_img}"

payload = {
    "fileBase64": data_uri,
    "hint": "Electric Vehicle Registration"
}

req = urllib.request.Request(
    "http://localhost:3000/api/documents/verify",
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    print("Sending request to http://localhost:3000/api/documents/verify...")
    with urllib.request.urlopen(req) as response:
        result = response.read()
        print("Response Code:", response.getcode())
        try:
            print("Response Body:\n", json.dumps(json.loads(result), indent=2))
        except:
            print("Response Body:\n", result.decode('utf-8'))
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
