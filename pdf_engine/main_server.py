# main_server.py
"""
FastAPI service for generating interview scorecard PDFs from transcripts.
Provides WebSocket endpoint for real-time generation and HTTP endpoint for downloads.
"""
import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from scorecard_api import generate_scorecard

# Load environment variables
load_dotenv()

# Set up logging
log_level = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, log_level),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="PDF Engine Service",
    description="Generate interview scorecard PDFs from transcripts",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Output directories
PDF_OUTPUT_DIR = "generated_pdfs"
HTML_OUTPUT_DIR = "outputs"

# Create directories if they don't exist
os.makedirs(PDF_OUTPUT_DIR, exist_ok=True)
os.makedirs(HTML_OUTPUT_DIR, exist_ok=True)

# -----------------
# HEALTH CHECK ENDPOINT
# -----------------
@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration"""
    return {
        "status": "healthy",
        "service": "pdf-engine",
        "timestamp": datetime.now().isoformat()
    }

# -----------------
# WEBSOCKET ENDPOINT (Real-time PDF Generation)
# -----------------
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time PDF generation.
    
    Expected message format: Plain text transcript
    Response format: Status messages followed by SUCCESS|message|download_url or ERROR|message
    """
    await websocket.accept()
    logger.info("WebSocket connection accepted")
    
    try:
        # Receive transcript content
        transcript_content = await websocket.receive_text()
        logger.info(f"Received transcript ({len(transcript_content)} chars)")
        
        await websocket.send_text("Status: Transcript received. Starting generation...")
        
        # Validate transcript
        if not transcript_content or not transcript_content.strip():
            error_msg = "ERROR|Transcript is empty or invalid"
            await websocket.send_text(error_msg)
            logger.error("Empty transcript received")
            return
        
        await websocket.send_text("Status: Analyzing transcript with LLM...")
        
        # Generate scorecard using the scorecard_api
        result = generate_scorecard(
            transcript_text=transcript_content,
            output_dir=HTML_OUTPUT_DIR,
            save_files=True,
            include_pdf_link_in_html=False
        )
        
        if not result['success']:
            error_msg = f"ERROR|{result.get('error', 'Unknown error occurred')}"
            await websocket.send_text(error_msg)
            logger.error(f"Generation failed: {result.get('error')}")
            return
        
        await websocket.send_text("Status: Saving PDF...")
        
        # Save PDF to the generated_pdfs directory
        if result['pdf_bytes']:
            filename = f"report_{result['timestamp']}.pdf"
            pdf_path = os.path.join(PDF_OUTPUT_DIR, filename)
            
            with open(pdf_path, 'wb') as f:
                f.write(result['pdf_bytes'])
            
            logger.info(f"PDF saved: {pdf_path}")
            
            # Send success response
            download_url = f"/download/{filename}"
            success_msg = f"SUCCESS|PDF generated successfully|{download_url}"
            await websocket.send_text(success_msg)
            logger.info(f"Generation complete: {download_url}")
        else:
            error_msg = "ERROR|PDF generation failed - no PDF bytes returned"
            await websocket.send_text(error_msg)
            logger.error("PDF generation returned no bytes")
        
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected")
    except Exception as e:
        error_msg = f"ERROR|An error occurred: {str(e)}"
        try:
            await websocket.send_text(error_msg)
        except:
            pass
        logger.exception(f"Error in WebSocket handler: {e}")

# -----------------
# HTTP DOWNLOAD ENDPOINT
# -----------------
@app.get("/download/{filename}")
async def download_file(filename: str):
    """
    HTTP endpoint to download generated PDF files.
    
    Args:
        filename: Name of the PDF file to download
        
    Returns:
        FileResponse with the PDF file
    """
    # Security: Prevent directory traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        logger.warning(f"Invalid filename requested: {filename}")
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    file_path = os.path.join(PDF_OUTPUT_DIR, filename)
    
    if not os.path.exists(file_path):
        logger.warning(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
    
    logger.info(f"Serving file: {filename}")
    return FileResponse(
        file_path,
        media_type='application/pdf',
        filename=filename
    )

# -----------------
# ROOT ENDPOINT
# -----------------
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "PDF Engine Service",
        "version": "1.0.0",
        "endpoints": {
            "websocket": "/ws",
            "download": "/download/{filename}",
            "health": "/health"
        },
        "status": "running"
    }