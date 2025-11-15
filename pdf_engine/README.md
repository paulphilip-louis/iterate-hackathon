# PDF Engine Service

A production-ready Dockerized FastAPI service for generating interview scorecard PDFs from transcripts using AI analysis.

## Features

- 🚀 **WebSocket API** for real-time PDF generation with status updates
- 📄 **HTTP API** for downloading generated PDFs
- 🤖 **AI-Powered Analysis** using Anthropic Claude 3.5 Sonnet
- 🐳 **Fully Dockerized** with Playwright support
- 🔄 **Configurable Port** - Supports random ports to avoid conflicts
- 🏥 **Health Checks** for container orchestration
- 📊 **Structured Scoring** based on 7 criteria rubric
- 🎨 **Beautiful HTML Reports** with PDF export

## Quick Start

### Prerequisites

- Docker installed
- Anthropic API key

### Setup

1. **Create environment file**
   ```bash
   cp env.example .env
   ```

2. **Add your Anthropic API key to `.env`**
   ```bash
   ANTHROPIC_API_KEY=your_actual_api_key_here
   ```

3. **Build and run with Docker**
   
   **Option A: Fixed port (8000)**
   ```bash
   docker build -t pdf-engine:latest .
   docker run -p 8000:8000 --env-file .env pdf-engine:latest
   ```
   
   **Option B: Random host port (avoids conflicts)**
   ```bash
   docker build -t pdf-engine:latest .
   docker run -p 0:8000 --env-file .env pdf-engine:latest
   ```
   Docker will assign a random available port. Find it with:
   ```bash
   docker ps
   ```
   
   **Option C: Custom port**
   ```bash
   docker run -p 8080:8000 --env-file .env pdf-engine:latest
   ```

The service will be available at the mapped port (check with `docker ps`)

## API Endpoints

### 1. Health Check
```http
GET /health
```

Returns service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "pdf-engine",
  "timestamp": "2024-01-15T10:30:00"
}
```

### 2. WebSocket - Generate PDF
```
WS /ws
```

Real-time PDF generation with status updates.

**Usage:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws');

ws.onopen = () => {
  // Send transcript text
  ws.send(transcriptText);
};

ws.onmessage = (event) => {
  const message = event.data;
  
  if (message.startsWith('Status:')) {
    console.log(message); // Progress update
  } else if (message.startsWith('SUCCESS')) {
    const [status, msg, downloadUrl] = message.split('|');
    console.log('PDF ready:', downloadUrl);
    // Download from: http://localhost:8000${downloadUrl}
  } else if (message.startsWith('ERROR')) {
    const [status, errorMsg] = message.split('|');
    console.error('Error:', errorMsg);
  }
};
```

**Status Messages:**
- `Status: Transcript received. Starting generation...`
- `Status: Analyzing transcript with LLM...`
- `Status: Saving PDF...`
- `SUCCESS|PDF generated successfully|/download/{filename}`
- `ERROR|Error message`

### 3. Download PDF
```http
GET /download/{filename}
```

Download a generated PDF file.

**Example:**
```bash
curl -O http://localhost:8000/download/report_20240115_103000.pdf
```

### 4. Root Endpoint
```http
GET /
```

Service information and available endpoints.

## Docker Commands

### Build the image
```bash
docker build -t pdf-engine:latest .
```

### Run the container
```bash
# With random port to avoid conflicts
docker run -p 0:8000 -e ANTHROPIC_API_KEY=your_key pdf-engine:latest

# With specific port
docker run -p 8000:8000 -e ANTHROPIC_API_KEY=your_key pdf-engine:latest
```

### Run with environment file
```bash
# Random port
docker run -p 0:8000 --env-file .env pdf-engine:latest

# Specific port
docker run -p 8000:8000 --env-file .env pdf-engine:latest
```

### Find the assigned port
```bash
docker ps
# Look for the port mapping: 0.0.0.0:XXXXX->8000/tcp
```

### View logs
```bash
docker logs -f <container_id>
```

### Stop container
```bash
docker stop <container_id>
```

## Development

### Local Development (without Docker)

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Install Playwright browsers**
   ```bash
   playwright install chromium
   ```

3. **Set environment variables**
   ```bash
   export ANTHROPIC_API_KEY=your_key
   ```

4. **Run the server**
   ```bash
   uvicorn main_server:app --reload --host 0.0.0.0 --port 8000
   ```

### Project Structure

```
pdf_engine/
├── main_server.py          # FastAPI application with WebSocket
├── scorecard_api.py        # PDF generation orchestration
├── scoring_engine.py       # AI scoring logic with OpenAI
├── output_generator.py     # HTML/PDF output generation
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker configuration
├── .dockerignore          # Docker ignore patterns
├── env.example            # Environment template
└── README.md              # This file

Output Directories:
├── generated_pdfs/        # Generated PDF files
└── outputs/               # HTML and other outputs
```

## Scoring Criteria

The service evaluates candidates on 7 criteria:

**Role-Based Skills (0-4 points each):**
1. Analytical thinking and problem solving
2. Mastering analytical toolset (Python, etc.)
3. Communication with stakeholders

**Cultural Fit (0-2 points each):**
4. Ambition / High standards
5. Curiosity
6. Honesty / Integrity
7. Work ethic

**Total Score:** 20 points maximum

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Anthropic API key for Claude |
| `PORT` | No | 8000 | Server port (inside container) |
| `HOST` | No | 0.0.0.0 | Server host |
| `LOG_LEVEL` | No | INFO | Logging level (DEBUG, INFO, WARNING, ERROR) |

## Output Format

The service generates:
- **PDF Report** - Professional scorecard with scores and feedback
- **HTML Report** - Formatted web view of the scorecard
- **Structured Data** - JSON with detailed scoring information

## Error Handling

The service includes comprehensive error handling:
- Invalid transcript validation
- OpenAI API error handling
- PDF generation fallbacks
- Detailed logging for debugging

## Production Considerations

1. **Security:**
   - Configure CORS appropriately (currently set to `allow_origins=["*"]`)
   - Use environment variables for sensitive data
   - Implement rate limiting if needed

2. **Monitoring:**
   - Health check endpoint for orchestration
   - Structured logging for observability
   - Consider adding metrics (Prometheus, etc.)

3. **Scaling:**
   - Stateless design allows horizontal scaling
   - Generated files stored in volumes
   - Consider adding cloud storage for PDFs

4. **Performance:**
   - Playwright uses headless Chromium (efficient)
   - Async FastAPI for concurrent requests
   - Consider caching for repeated transcripts

## Troubleshooting

### Playwright browser not found
The Dockerfile automatically installs Chromium during build. If issues persist, rebuild the image:
```bash
docker build --no-cache -t pdf-engine:latest .
```

### Anthropic API errors
- Verify API key is correct in `.env`
- Check API rate limits and quotas
- Review logs: `docker logs -f <container_id>`
- Ensure you have access to Claude 3.5 Sonnet

### Port already in use
```bash
# Use a random available port
docker run -p 0:8000 --env-file .env pdf-engine:latest

# Or specify a different port
docker run -p 8001:8000 --env-file .env pdf-engine:latest
```

### Can't find the service port
```bash
# List running containers with port mappings
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## Testing

### Test with curl
```bash
# Health check
curl http://localhost:8000/health

# Service info
curl http://localhost:8000/
```

### Test WebSocket with Python
```python
import asyncio
import websockets

async def test_pdf_generation():
    uri = "ws://localhost:8000/ws"
    
    transcript = """
    Interviewer: Tell me about your problem-solving approach?
    Candidate: I analyze the problem thoroughly, break it down...
    """
    
    async with websockets.connect(uri) as websocket:
        await websocket.send(transcript)
        
        async for message in websocket:
            print(f"Received: {message}")
            if message.startswith('SUCCESS') or message.startswith('ERROR'):
                break

asyncio.run(test_pdf_generation())
```

## License

[Your License]

## Support

For issues or questions, please open an issue in the repository.

