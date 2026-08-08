import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

app = FastAPI(title="AI-SIEM Core Engine")

# Enable CORS for Next.js frontend (WILDCARD MODE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

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
    nodes: list[Node]
    edges: list[Edge]
    timeline_steps: list[TimelineStep]
    remediation_steps: list[str]

class LogAnalysisRequest(BaseModel):
    logs: list[dict]

@app.get("/")
def health_check():
    return {"status": "AI-SIEM Engine operational"}

# --- ADD THIS NEW SECTION FOR LIVE TELEMETRY ---
live_log_buffer = []

@app.post("/api/ingest")
async def ingest_live_logs(payload: LogAnalysisRequest):
    global live_log_buffer
    live_log_buffer.extend(payload.logs)
    print(f"[*] Received {len(payload.logs)} live logs from endpoint!")
    return {"status": "success", "message": "Logs buffered"}

@app.get("/api/live-logs")
async def get_live_logs():
    global live_log_buffer
    logs_to_return = live_log_buffer.copy()
    live_log_buffer.clear() # Flush the buffer after reading
    return {"logs": logs_to_return}
# -----------------------------------------------

@app.post("/api/analyze-logs", response_model=IncidentAnalysisResponse)
async def analyze_logs(payload: LogAnalysisRequest):
    try:
        # ---> THE SAFETY VALVE: Keep only the 10 most recent logs to stay under the Groq token limit <---
        trimmed_logs = payload.logs[-10:]

        prompt = f"""
        You are an elite Incident Response Specialist. Analyze these raw security logs and reconstruct the attack path.

        You MUST output strictly valid JSON that exactly matches this structure, with no extra root keys:
        {{
            "patient_zero": "string (Origin entity/IP of the attack)",
            "critical_escalation_point": "string (The moment high privileges or lateral movement occurred)",
            "nodes": [
                {{"id": "string (Unique ID like an IP, username, or filename)", "label": "string (Display label)", "type": "string (Must be one of: User, IP, Hostname, File, Process)"}}
            ],
            "edges": [
                {{"source": "string (ID of source node)", "target": "string (ID of target node)", "action": "string (Action verb, e.g. Executed, Opened)"}}
            ],
            "timeline_steps": [
                {{"id": 1, "title": "string (Stage name)", "desc": "string (Brief explanation)"}}
            ],
            "remediation_steps": [
                "string (Actionable security containment step)"
            ]
        }}

        Logs:
        {json.dumps(trimmed_logs, indent=2)}
        """

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a cybersecurity data parser. Output ONLY valid JSON matching the exact requested schema."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.1 # Low temperature so it doesn't get creative with the schema
        )

        result_text = response.choices[0].message.content
        parsed_json = json.loads(result_text)
        
        # Failsafe: if the LLM still wraps it in an 'analysis' key, extract it
        if "analysis" in parsed_json:
            parsed_json = parsed_json["analysis"]

        return parsed_json

    except Exception as e:
        print("ERROR PARSING GROQ RESPONSE:", str(e))
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)