"""
Standalone Scorecard API Module
================================

This module provides a simple interface to generate interview scorecards
without any UI framework dependencies. Perfect for integration into any
backend (Flask, FastAPI, Django, etc.).

Usage Example:
--------------
from scorecard_api import generate_scorecard

# Generate scorecard from transcript
result = generate_scorecard(transcript_text)

# Access results
html = result['html_content']      # Full HTML string
pdf_path = result['pdf_path']      # Path to saved PDF
pdf_bytes = result['pdf_bytes']    # Raw PDF bytes for download
timestamp = result['timestamp']    # Generation timestamp

Integration Examples:
--------------------

# Flask example:
@app.route('/api/scorecard', methods=['POST'])
def create_scorecard():
    transcript = request.json.get('transcript')
    result = generate_scorecard(transcript)
    
    # Return HTML
    return jsonify({'html': result['html_content']})
    
# Or stream PDF directly:
@app.route('/api/scorecard/pdf', methods=['POST'])
def download_scorecard_pdf():
    transcript = request.json.get('transcript')
    result = generate_scorecard(transcript)
    
    return send_file(
        io.BytesIO(result['pdf_bytes']),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f"scorecard_{result['timestamp']}.pdf"
    )

# FastAPI example:
@app.post("/api/scorecard")
async def create_scorecard(transcript: str):
    result = generate_scorecard(transcript)
    return {"html": result['html_content'], "pdf_url": f"/download/{result['timestamp']}.pdf"}
"""

import os
import base64
from datetime import datetime
from typing import Dict, Any, Optional
from playwright.async_api import async_playwright
from scoring_engine import generate_score
from output_generator import create_html_output


async def generate_scorecard(
    transcript_text: str,
    output_dir: str = "outputs",
    save_files: bool = True,
    include_pdf_link_in_html: bool = True
) -> Dict[str, Any]:
    """
    Generate a complete interview scorecard with HTML and PDF outputs.
    
    Parameters:
    -----------
    transcript_text : str
        The interview transcript text to analyze
    output_dir : str, optional
        Directory to save output files (default: "outputs")
    save_files : bool, optional
        Whether to save HTML and PDF files to disk (default: True)
    include_pdf_link_in_html : bool, optional
        Whether to include a PDF download link in the HTML output (default: True)
    
    Returns:
    --------
    dict
        {
            'success': bool,
            'html_content': str,           # Full HTML content
            'html_path': str or None,      # Path to saved HTML file (if save_files=True)
            'pdf_path': str or None,       # Path to saved PDF file (if PDF generated)
            'pdf_bytes': bytes or None,    # Raw PDF bytes
            'timestamp': str,              # Timestamp of generation
            'score_data': dict,            # Raw score data from LLM
            'error': str or None           # Error message if failed
        }
    
    Raises:
    -------
    ValueError
        If transcript_text is empty or invalid
        If OpenAI API key is not configured
    Exception
        If LLM analysis fails or PDF generation fails
    """
    
    # Validate input
    if not transcript_text or not transcript_text.strip():
        return {
            'success': False,
            'error': 'Transcript text is empty or invalid',
            'html_content': None,
            'html_path': None,
            'pdf_path': None,
            'pdf_bytes': None,
            'timestamp': None,
            'score_data': None
        }
    
    try:
        # Generate timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Step 1: Generate scores using LLM
        score_data = generate_score(transcript_text)
        
        # Step 2: Create HTML output
        html_output = create_html_output(score_data)
        
        # Initialize return values
        html_path = None
        pdf_path = None
        pdf_bytes = None
        
        # Step 3: Save files if requested
        if save_files:
            os.makedirs(output_dir, exist_ok=True)
            html_path = os.path.join(output_dir, f"scorecard_{timestamp}.html")
            pdf_path = os.path.join(output_dir, f"scorecard_{timestamp}.pdf")
        
        # Step 4: Generate PDF
        pdf_generated = False
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch()
                page = await browser.new_page()
                await page.set_content(html_output, wait_until='networkidle')
                
                # Generate PDF bytes
                pdf_bytes = await page.pdf(
                    format='A4',
                    print_background=True,
                    margin={
                        'top': '20mm',
                        'right': '15mm',
                        'bottom': '20mm',
                        'left': '15mm'
                    }
                )
                await browser.close()
                pdf_generated = True
                
                # Save PDF to file if requested
                if save_files and pdf_path:
                    with open(pdf_path, 'wb') as f:
                        f.write(pdf_bytes)
                        
        except Exception as pdf_error:
            print(f"Warning: PDF generation failed: {pdf_error}")
            pdf_bytes = None
            pdf_path = None
        
        # Step 5: Add PDF download link to HTML if requested and PDF was generated
        if include_pdf_link_in_html and pdf_generated and pdf_bytes:
            # Create base64 data URL for PDF
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')
            pdf_data_url = f"data:application/pdf;base64,{pdf_base64}"
            
            pdf_download_link = f"""
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #667eea;">
                <p style="margin: 0;"><strong>📄 PDF Available:</strong> 
                <a href="{pdf_data_url}" download="scorecard_{timestamp}.pdf" style="color: #667eea; text-decoration: underline; font-weight: bold;">
                    Download PDF Scorecard
                </a>
                </p>
            </div>
            """
            html_output = pdf_download_link + html_output
        
        # Step 6: Save HTML file if requested
        if save_files and html_path:
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_output)
        
        # Return complete result
        return {
            'success': True,
            'html_content': html_output,
            'html_path': html_path,
            'pdf_path': pdf_path if pdf_generated else None,
            'pdf_bytes': pdf_bytes if pdf_generated else None,
            'timestamp': timestamp,
            'score_data': score_data,
            'error': None
        }
    
    except ValueError as e:
        error_msg = str(e)
        return {
            'success': False,
            'error': error_msg,
            'html_content': None,
            'html_path': None,
            'pdf_path': None,
            'pdf_bytes': None,
            'timestamp': None,
            'score_data': None
        }
    
    except Exception as e:
        error_msg = f"Error processing transcript: {str(e)}"
        return {
            'success': False,
            'error': error_msg,
            'html_content': None,
            'html_path': None,
            'pdf_path': None,
            'pdf_bytes': None,
            'timestamp': None,
            'score_data': None
        }


async def generate_scorecard_simple(transcript_text: str) -> Dict[str, Any]:
    """
    Simplified version that returns only HTML and PDF bytes (no file saving).
    Perfect for API endpoints that stream responses directly.
    
    Parameters:
    -----------
    transcript_text : str
        The interview transcript text to analyze
    
    Returns:
    --------
    dict
        {
            'success': bool,
            'html_content': str,
            'pdf_bytes': bytes or None,
            'timestamp': str,
            'error': str or None
        }
    """
    result = await generate_scorecard(
        transcript_text=transcript_text,
        save_files=False,
        include_pdf_link_in_html=False
    )
    
    # Return simplified version
    return {
        'success': result['success'],
        'html_content': result['html_content'],
        'pdf_bytes': result['pdf_bytes'],
        'timestamp': result['timestamp'],
        'error': result['error']
    }


# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    # Test with sample transcript
    sample_transcript = """
    Interviewer: Can you tell me about a complex problem you solved recently?
    Candidate: Yes, I worked on optimizing our data pipeline. I analyzed the bottlenecks,
    implemented parallel processing, and reduced execution time by 60%.
    
    Interviewer: What tools did you use?
    Candidate: I used Python with pandas for data manipulation, and set up monitoring dashboards
    in Metabase to track performance metrics.
    
    Interviewer: How do you communicate results to stakeholders?
    Candidate: I create clear visualizations and tell a story with the data, tailoring my message
    to different audiences - technical and non-technical.
    """
    
    async def test():
        print("Generating scorecard...")
        result = await generate_scorecard(sample_transcript)
        
        if result['success']:
            print(f"✅ Success!")
            print(f"   Timestamp: {result['timestamp']}")
            print(f"   HTML saved: {result['html_path']}")
            print(f"   PDF saved: {result['pdf_path']}")
            print(f"   HTML length: {len(result['html_content'])} chars")
            print(f"   PDF size: {len(result['pdf_bytes']) if result['pdf_bytes'] else 0} bytes")
        else:
            print(f"❌ Error: {result['error']}")
    
    asyncio.run(test())

