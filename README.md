ChronoBreach: AI-Powered SIEM & Live Threat Mapping 

ChronoBreach is a full-stack, AI-driven Security Information and Event Management (SIEM) pipeline. It actively ingests raw Windows endpoint telemetry, processes it through a custom FastAPI backend, and utilizes LLaMA 3-70B (via Groq) to dynamically reconstruct multi-stage cyber attacks into a visual, interactive node graph in real-time.

#System Architecture
This project simulates a real-world enterprise telemetry pipeline, bypassing local network restrictions to deliver asynchronous threat intelligence.

1. Endpoint Telemetry (Victim): Windows Sysmon tracks kernel-level process executions, file staging, and network beacons.
2. Log Shipper (Python): A custom script utilizing isolated virtual environments polls the Event Viewer and securely ships batched logs over the network.
3. Backend Engine (FastAPI): Ingests asynchronous log streams, manages memory buffers to prevent LLM rate-limiting, and processes data using strict Pydantic models.
4. AI Threat Parsing (LLaMA 3-70B): Zero-shot prompt engineering forces the LLM to extract malicious behavior and map standard attack edges (Source -> Target -> Action).
5. Interactive UI (Next.js & React Flow): Renders the complex JSON output into a dynamic, branching attack graph alongside an automated incident remediation playbook.

Tech Stack
Frontend: Next.js, React Flow, Tailwind CSS
Backend: Python, FastAPI, Uvicorn
AI/LLM: Groq API, LLaMA 3-70B-Versatile
Telemetry: Windows Sysmon, PowerShell
Networking: Localtunnel (HTTPS tunneling for hotspot isolation bypass)

Core Features
Real-Time Threat Ingestion: Continuous log buffering and automated AI trigger events.
Complex Attack Simulation: Built-in PowerShell scripts mimicking multi-stage kill chains (Reconnaissance, File Staging, Evasion, C2 Exfiltration).
Network Isolation Bypass: Engineered local loopbacks and public tunneling to ensure telemetry flows across heavily restricted mobile hotspot environments.
Automated Playbook Generation: Context-aware security mitigation steps dynamically generated based on the specific attack blast radius.

Local Setup & Installation

1. Start the Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
