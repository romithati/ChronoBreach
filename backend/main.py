import os
import json
import csv
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from dotenv import load_dotenv
from groq import Groq

# Load environment variables
load_dotenv()

# Initialize FastAPI App
app = FastAPI(title="BonoBridge Security Engine")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    print("WARNING: GROQ_API_KEY not found in .env file!")
client = Groq(api_key=groq_api_key)

# Global Buffer to store incoming Sysmon telemetry
live_log_buffer = []

# ==========================================
# AUTOMATED THREAT INTEL DOWNLOADER
# ==========================================
@app.on_event("startup")
async def update_exploit_db():
    """
    Downloads the latest Exploit-DB CSV file every time the server starts.
    """
    csv_url = "https://gitlab.com/exploit-database/exploitdb/-/raw/main/files_exploits.csv"
    file_path = "files_exploits.csv"
    
    print("[*] Checking for Exploit-DB updates from GitLab...")
    
    try:
        async with httpx.AsyncClient(follow_redirects=True) as http_client:
            response = await http_client.get(csv_url)
            
            if response.status_code == 200:
                with open(file_path, "wb") as file:
                    file.write(response.content)
                print("[+] Exploit-DB database successfully updated!")
            else:
                print(f"[!] Failed to download DB. Status code: {response.status_code}")
                
    except Exception as e:
        print(f"[!] Error updating Exploit-DB: {str(e)}")
        print("[*] BonoBridge will fall back to the existing local CSV if it exists.")

# ==========================================
# RETRIEVAL-AUGMENTED GENERATION (RAG) HELPER
# ==========================================
def get_exploit_context(keywords):
    """
    Scans the local Exploit-DB CSV for Windows-specific vulnerabilities matching log keywords.
    """
    exploit_intelligence = []
    try:
        with open('files_exploits.csv', mode='r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            for row in reader:
                platform = row.get('platform', '').lower()
                description = row.get('description', '').lower()
                
                # Filter strictly for Windows or cross-platform vulnerabilities
                if platform in ['windows', 'multiple', 'win32', 'win64']:
                    if any(kw in description for kw in keywords):
                        exploit_intelligence.append(
                            f"Exploit ID {row.get('id')}: {row.get('description')} (Platform: {row.get('platform')})"
                        )
                        
                # Limit to top 5 results
                if len(exploit_intelligence) >= 5:
                    break
    except FileNotFoundError:
        return "Exploit-DB database not found locally. Proceeding with standard analysis."
        
    return "\n".join(exploit_intelligence) if exploit_intelligence else "No known Windows exploits found in DB for these keywords."

# ==========================================
# PYDANTIC SCHEMAS (Data Validation)
# ==========================================

class LogPayload(BaseModel):
    logs: List[Dict[str, Any]]

class LogAnalysisRequest(BaseModel):
    logs: List[Dict[str, Any]]

class Node(BaseModel):
    id: str
    label: str
    type: str

class Edge(BaseModel):
    source: str
    target: str
    action: str

class TimelineStep(BaseModel):
    id: int
    title: str
    desc: str

class IncidentAnalysisResponse(BaseModel):
    patient_zero: str
    critical_escalation_point: str
    nodes: List[Node]
    edges: List[Edge]
    timeline_steps: List[TimelineStep]
    remediation_steps: List[str]

# ==========================================
# API ENDPOINTS
# ==========================================

@app.post("/api/ingest")
async def ingest_logs(payload: LogPayload):
    """
    Receives raw Sysmon logs from the Python log shipper and appends them to the live buffer.
    """
    global live_log_buffer
    live_log_buffer.extend(payload.logs)
    
    if len(live_log_buffer) > 1000:
        live_log_buffer = live_log_buffer[-1000:]
        
    return {"status": "success", "message": f"Ingested {len(payload.logs)} logs"}


@app.get("/api/live-logs")
async def get_logs():
    """
    Returns the current live log buffer to the Next.js frontend.
    """
    return {"logs": live_log_buffer}


@app.delete("/api/live-logs")
async def clear_logs():
    """
    Clears the log buffer (triggered by the 'Clear' button on the dashboard).
    """
    global live_log_buffer
    live_log_buffer.clear()
    return {"status": "success", "message": "Buffer cleared"}


@app.post("/api/analyze-logs", response_model=IncidentAnalysisResponse)
async def analyze_logs(payload: LogAnalysisRequest):
    """
    Sends batched logs AND Exploit-DB context to Groq for threat analysis.
    """
    try:
        # 1. Refined Filter: Removed hallucination triggers ("exec", "temp")
        attack_keywords = [
            "powershell", "cmd.exe", "whoami", "net user", "net localgroup", 
            "ipconfig", "downloadstring", "invoke-", "stolen", "full_attack", 
            "svchost_update", "bypass", "payload"
        ]
        
        prioritized_logs = [
            log for log in payload.logs 
            if any(kw in json.dumps(log).lower() for kw in attack_keywords)
        ]

        # Grab up to 15 logs to ensure a much larger, complex graph
        if prioritized_logs:
            trimmed_logs = prioritized_logs[-15:]
        else:
            trimmed_logs = payload.logs[-15:]

        # 2. RAG Context: Fetch matching Windows exploits
        exploit_db_context = get_exploit_context(attack_keywords)

        # 3. Prompt Construction (STRICT ANCHORING & CITATION)
        prompt = f"""
        You are an elite Incident Response Specialist. Analyze these raw security logs and reconstruct the EXACT chronological attack path.

        CRITICAL THREAT INTELLIGENCE (From Exploit-DB):
        {exploit_db_context}

        RULES FOR GENERATION:
        1. DO NOT hallucinate or invent processes (like Oracle or Adobe) just because they appear in the Threat Intelligence. The provided Logs are the absolute truth.
        2. Extract EVERY distinct process execution, file creation, and network connection to create a large, deeply nested graph (map at least 5 to 8 nodes).
        3. VISIBILITY: You MUST explicitly mention the "Exploit ID" and vulnerability names from the Threat Intelligence directly inside the `timeline_steps` descriptions and `remediation_steps` so the user can see the database correlation.

        You MUST output strictly valid JSON that exactly matches this structure, with no extra root keys:
        {{
            "patient_zero": "string (Origin entity/IP of the attack)",
            "critical_escalation_point": "string (The moment high privileges or lateral movement occurred)",
            "nodes": [
                {{"id": "string", "label": "string (Display label)", "type": "string (Must be User, IP, Hostname, File, or Process)"}}
            ],
            "edges": [
                {{"source": "string", "target": "string", "action": "string (e.g. Spawned, Created, Connected)"}}
            ],
            "timeline_steps": [
                {{"id": 1, "title": "string", "desc": "string (MUST INCLUDE EXPLOIT ID IF RELEVANT)"}}
            ],
            "remediation_steps": [
                "string (MUST INCLUDE EXPLOIT ID IF RELEVANT)"
            ]
        }}

        Logs:
        {json.dumps(trimmed_logs, indent=2)}
        """

        # 4. LLM API Call
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a cybersecurity data parser. Output ONLY valid JSON matching the exact requested schema."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1
        )

        result_text = response.choices[0].message.content
        parsed_json = json.loads(result_text)
        
        if "analysis" in parsed_json:
            parsed_json = parsed_json["analysis"]

        return parsed_json

    except Exception as e:
        print("ERROR PARSING GROQ RESPONSE:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
