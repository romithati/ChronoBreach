ChronoBreach: AI-Powered SIEM & Live Threat Mapping

ChronoBreach is a full-stack, AI-driven Security Information and Event Management (SIEM) pipeline. It actively ingests raw Windows endpoint telemetry, processes it through a custom FastAPI backend, and utilizes Retrieval-Augmented Generation (RAG) with LLaMA 3-70B (via Groq) to dynamically reconstruct multi-stage cyber attacks into a visual, interactive node graph in real-time.

System Architecture
This project simulates a real-world enterprise telemetry pipeline, bypassing local network restrictions and cross-referencing live logs with day-zero vulnerability databases.

1. Endpoint Telemetry (Victim): Windows Sysmon tracks kernel-level process executions, file staging, and network beacons.
2. Log Shipper (Python): A custom script utilizing isolated virtual environments polls the Event Viewer and securely ships batched logs over the network.
3. Backend Engine (FastAPI): Ingests asynchronous log streams, manages memory buffers, and automatically pulls the latest Exploit-DB database from GitLab upon server boot.
4. RAG Threat Parsing (LLaMA 3-70B): Dynamically filters Windows OS logs and cross-references them with local Exploit-DB threat intelligence. Zero-shot prompt engineering forces the LLM to map standard attack edges and explicitly cite real-world vulnerability IDs.
5. Interactive UI (Next.js & React Flow): Renders the complex JSON output into a dynamic, branching attack graph alongside a vulnerability-aware incident remediation playbook.

Tech Stack
Frontend: Next.js, React Flow, Tailwind CSS
Backend: Python, FastAPI, Uvicorn, httpx
AI/LLM: Groq API, LLaMA 3-70B-Versatile (RAG Architecture)
Threat Intelligence: Offensive Security Exploit-DB
Telemetry: Windows Sysmon, PowerShell
Networking: Localtunnel (HTTPS tunneling for hotspot client isolation bypass)

Core Features
Retrieval-Augmented Generation (RAG): AI engine cross-references live logs against a locally stored, auto-updating Exploit-DB database to provide vulnerability-specific mitigation.
Real-Time Threat Ingestion: Continuous log buffering and automated AI trigger events.
Complex Attack Simulation: Built-in PowerShell scripts mimicking multi-stage kill chains (Reconnaissance, File Staging, Privilege Escalation).
Network Isolation Bypass: Engineered reverse proxy tunneling to ensure telemetry flows seamlessly across heavily restricted mobile hotspot environments.

Local Setup & Installation

1. Start the Backend (FastAPI)
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
