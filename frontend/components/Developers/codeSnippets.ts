export type SupportedLang = "curl" | "javascript" | "python";

export const codeExamples: Record<string, Record<SupportedLang, string>> = {
  createShipment: {
    curl: `curl -X POST https://userecover.xyz/api/v1/shipments/create \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -d '{
    "packageName": "iPhone 15 Pro Dispatch",
    "weight": "0.45",
    "receiverPhone": "+2348012345678"
  }'`,
    javascript: `const response = await fetch('https://userecover.xyz/api/v1/shipments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...'
  },
  body: JSON.stringify({
    packageName: 'iPhone 15 Pro Dispatch',
    receiverName: 'John Doe',
    receiverPhone: '+2348012345678',
    destination: 'Lekki, Lagos',
    weight: '0.45'
  })
});

const data = await response.json();
console.log('Dispatch Created:', data.packageId, data.innerSecret);`,
    python: `import requests

url = "https://userecover.xyz/api/v1/shipments/create"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer rec_live_8f921a4b901e23f..."
}
payload = {
    "packageName": "iPhone 15 Pro Dispatch",
    "receiverName": "John Doe",
    "receiverPhone": "+2348012345678",
    "destination": "Lekki, Lagos",
    "weight": "0.45"
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
  },
  getQrCode: {
    curl: `curl -X GET "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/qr?format=json"`,
    javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/qr?format=json');
const qrData = await res.json();
console.log('QR Code Image Link:', qrData.qrImageUrl); // PNG format for labels
console.log('Public Verification Scan Link:', qrData.scanUrl);`,
    python: `import requests

res = requests.get("https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/qr?format=json")
print(res.json())`,
  },
  verifyShipment: {
    curl: `curl -X GET "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify"`,
    javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify');
const packageData = await res.json();
console.log('Package Status:', packageData.status); // InTransit | Delivered | Disputed`,
    python: `import requests

res = requests.get("https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify")
print(res.json())`,
  },
  handoverShipment: {
    curl: `curl -X POST "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/handover" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "riderName": "John Rider", "riderPhone": "+2348011223344", "location": "Ikeja Hub, Lagos" }'`,
    javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/handover', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ riderName: 'John Rider', riderPhone: '+2348011223344', location: 'Ikeja Hub, Lagos' })
});
const result = await res.json();
console.log('Handover Status:', result.shipment.status);`,
    python: `import requests

res = requests.post(
    "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/handover",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"riderName": "John Rider", "riderPhone": "+2348011223344", "location": "Ikeja Hub, Lagos"}
)
print(res.json())`,
  },
  confirmDelivery: {
    curl: `curl -X POST "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "innerSecret": "RCVR-A8F2B1C0", "location": "Lekki, Lagos" }'`,
    javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ innerSecret: 'RCVR-A8F2B1C0', location: 'Lekki, Lagos' })
});
const result = await res.json();
console.log('Delivery Verified:', result.shipment.status);`,
    python: `import requests

res = requests.post(
    "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/verify",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"innerSecret": "RCVR-A8F2B1C0", "location": "Lekki, Lagos"}
)
print(res.json())`,
  },
  historyShipment: {
    curl: `curl -X GET "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/history"`,
    javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/history');
const history = await res.json();
console.log('Custody Timeline Events:', history.events);`,
    python: `import requests

res = requests.get("https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/history")
print(res.json())`,
  },
  disputeShipment: {
    curl: `curl -X POST "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/dispute" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "innerSecret": "RCVR-A8F2B1C0", "reason": "Damaged contents on arrival", "location": "Lagos" }'`,
    javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/dispute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ innerSecret: 'RCVR-A8F2B1C0', reason: 'Damaged contents on arrival', location: 'Lagos' })
});
const result = await res.json();
console.log('Dispute Logged:', result.success);`,
    python: `import requests

res = requests.post(
    "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D/dispute",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"innerSecret": "RCVR-A8F2B1C0", "reason": "Damaged contents on arrival", "location": "Lagos"}
)
print(res.json())`,
  },
  healthCheck: {
    curl: `curl -X GET "https://userecover.xyz/api/v1/health"`,
    javascript: `const res = await fetch('https://userecover.xyz/api/v1/health');
const health = await res.json();
console.log('API Health Status:', health.status); // "healthy"`,
    python: `import requests

res = requests.get("https://userecover.xyz/api/v1/health")
print(res.json())`,
  },
  listShipments: {
    curl: `curl -X GET "https://userecover.xyz/api/v1/shipments" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..."`,
    javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments', {
  headers: { 'Authorization': 'Bearer rec_live_8f921a4b901e23f...' }
});
const shipments = await res.json();
console.log('My Shipments:', shipments.length);`,
    python: `import requests

res = requests.get(
    "https://userecover.xyz/api/v1/shipments",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."}
)
print(res.json())`,
  },
  editShipment: {
    curl: `curl -X PATCH "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D" \\
  -H "Authorization: Bearer rec_live_8f921a4b901e23f..." \\
  -H "Content-Type: application/json" \\
  -d '{ "packageName": "Updated Parcel Name", "receiverPhone": "+2348099887766", "destination": "Lekki Phase 1" }'`,
    javascript: `const res = await fetch('https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer rec_live_8f921a4b901e23f...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ packageName: 'Updated Parcel Name', receiverPhone: '+2348099887766', destination: 'Lekki Phase 1' })
});
const result = await res.json();
console.log('Updated:', result.success);`,
    python: `import requests

res = requests.patch(
    "https://userecover.xyz/api/v1/shipments/RCV-8F912A3B4C5D",
    headers={"Authorization": "Bearer rec_live_8f921a4b901e23f..."},
    json={"packageName": "Updated Parcel Name", "receiverPhone": "+2348099887766", "destination": "Lekki Phase 1"}
)
print(res.json())`,
  },
};

export const webhookPayloadExample = `{
  "event": "shipment.delivered",
  "timestamp": "2026-08-03T14:30:00Z",
  "data": {
    "packageId": "RCV-8F912A3B4C5D",
    "companyName": "Big Eazi Logistics",
    "shipperAddress": "0x6e799abd05b044acb6d9a59605de21ec845c2180",
    "packageName": "iPhone 15 Pro Dispatch",
    "status": "Verified",
    "recipient": "0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
    "location": "Lagos, NG",
    "onChainTxHash": "0x8f912a3b4c5d..."
  }
};`;
