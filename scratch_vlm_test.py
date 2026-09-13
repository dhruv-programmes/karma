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

system_prompt = """You are the Evidence Verification Vision Model for a sustainability rewards system (EcoProof / EcoScan).
Your task is to inspect ONLY the submitted camera image and extract observable evidence.
Do not award points and do not invent environmental impact numbers.

You must:
1. Identify the document/object/evidence type (e.g. SOLAR_ELECTRICITY_BILL, ELECTRIC_VEHICLE_RC, EV_CHARGING_RECEIPT, SOLAR_INVERTER_DASHBOARD, APPLIANCE_ENERGY_LABEL).
2. Determine the claimed sustainability asset (solar_pv, electric_vehicle, solar_water_heater, energy_efficient_appliance, or other).
3. Extract visible fields exactly as written (e.g., kWh, dates, registration numbers, consumer numbers, meter numbers, vehicle make/model).
4. Distinguish observed facts from uncertain inference.
5. Identify contradictions, missing fields, suspicious alterations, screen photos, or poor image quality.
6. Decide whether the evidence is sufficient for the requested verification level.
7. Return structured JSON matching the required schema exactly.
8. Use null for fields that cannot be reliably read.
9. Never guess a number.
10. Never use outside knowledge as if it were visible evidence.
11. Set routing_hint:
    - "ev_section" if the document is an Electric Vehicle Registration Certificate (RC), EV purchase invoice, or EV charging bill/receipt.
    - "solar_section" if the document is a Solar generation bill, net-metering statement, or inverter generation dashboard.
    - "generic" for any other sustainability evidence.

The downstream backend system will independently calculate environmental impact and reward points deterministically.
Output ONLY valid JSON adhering to the schema. Do not enclose in markdown code blocks."""

payload = {
    "model": "google/gemma-4-e4b",
    "messages": [
        {
            "role": "system",
            "content": system_prompt
        },
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Please verify this Electric Vehicle Registration Document."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": data_uri
                    }
                }
            ]
        }
    ],
    "temperature": 0.0
}

req = urllib.request.Request(
    "http://127.0.0.1:1234/v1/chat/completions",
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"},
    method="POST"
)

try:
    print("Sending direct API request to LM Studio (http://127.0.0.1:1234/v1)...")
    with urllib.request.urlopen(req) as response:
        result = response.read()
        res_json = json.loads(result)
        content = res_json['choices'][0]['message']['content']
        print("\n--- VLM JSON OUTPUT ---\n")
        print(content)
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print(e.read().decode('utf-8'))
