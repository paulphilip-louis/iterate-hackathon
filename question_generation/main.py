from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn
import question_generation as generate_questions
import os
from langchain_anthropic import ChatAnthropic
from linkup import LinkupClient
import json

TRANSCRIPT = ""
CANDIDATE_INFOS = {}
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise ValueError("ANTHROPIC_API_KEY is not set")
LINKUP_API_KEY = os.getenv("LINKUP_API_KEY")
if not LINKUP_API_KEY:
    raise ValueError("LINKUP_API_KEY is not set")
CV = ""
JOB_OFFER = ""
COMPANY_VALUES = ""

app = FastAPI()
model = ChatAnthropic(
        model="claude-sonnet-4-5-20250929",
        temperature=0,
        max_tokens=256,
        timeout=20,
        max_retries=2,
        api_key=ANTHROPIC_API_KEY
    )
client = LinkupClient(api_key=LINKUP_API_KEY)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global TRANSCRIPT, CV, JOB_OFFER, CANDIDATE_INFOS, COMPANY_VALUES
    await websocket.accept()
    print("Client connected")
    try:
        while True:
            # Receive data from client
            data = await websocket.receive_text()
            data = json.loads(data)
            print(f"Received: {data}")
            if data["event"] == "TRANSCRIPT_CHUNK":
                TRANSCRIPT += data["payload"]
                TRANSCRIPT = TRANSCRIPT[-500:]
                # TODO : Identify keywords

                # TODO : Generate questions
                context = "#Job offer : " + JOB_OFFER + "\n\n#Company values : " + COMPANY_VALUES + "\n\n#Candidate profile : " + CV + "\n\n#Transcript : " + TRANSCRIPT
                QUESTION = generate_questions.generate_questions_online(model, context)
                await websocket.send_text(json.dumps({"event": "NEW_SUGGESTED_QUESTION", "payload": QUESTION}))
                
            elif data["event"] == "CANDIDATE_INFOS":
                CANDIDATE_INFOS = data["payload"]
                linkedin_url = CANDIDATE_INFOS.get("CANDIDATES_LINKEDIN") or CANDIDATE_INFOS.get("linkedin_url", "")
                job_description = CANDIDATE_INFOS.get("JOB_DESCRIPTION") or CANDIDATE_INFOS.get("job_offer", "")
                company_values = CANDIDATE_INFOS.get("COMPANY_VALUES", "")

                if linkedin_url:
                    # Ajouter https:// si manquant
                    if not linkedin_url.startswith("http"):
                        linkedin_url = "https://" + linkedin_url
                    print(f"Extracting LinkedIn profile from: {linkedin_url}")
                    CV = generate_questions.extract_linkedin(client, linkedin_url)
                    JOB_OFFER = job_description
                    COMPANY_VALUES = company_values
                
            elif data["event"] not in ["GREEN_FLAG", "RED_FLAG", "DEFINE_TERM", "TODO_CREATED", "TICK_TODO"]:
                print(f"Unknown event type: {data.get('event')}")
                await websocket.send_text(json.dumps({"event": "error", "payload": "Unknown event type"}))
                
    except WebSocketDisconnect:
        print("Client disconnected normally")
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {e}")
        await websocket.send_text(json.dumps({"type": "error", "message": f"Invalid JSON: {str(e)}"}))
    except Exception as e:
        print(f"Client disconnected : {e}")
        import traceback
        traceback.print_exc()
        try:
            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except:
            pass
        await websocket.close()



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)