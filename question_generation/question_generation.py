import re
import ast

def extract_linkedin(client, url):
    response = client.search(
        query=f"You are an expert recruiter. Review the LinkedIn profile at {url} and extract all relevant professional information to create a comprehensive memo tailored for recruiter review. Focus on summarizing work experience, education, key skills, certifications, and notable achievements. Organize the CV into clear sections (Summary, Experience, Education, Skills, Certifications, Achievements) and present the information in a clean, recruiter-friendly format using concise bullet points. Only extract factual informations.",
        depth="standard",
        output_type="sourcedAnswer",
        include_images=False,
        include_domains=[url],
        include_inline_citations=False,
    )
    return response.answer


def extract_github(client, url):
    response = client.search(
        query=f"You are an expert recruiter. Review the GitHub profile at {url} and extract all relevant professional information to create a comprehensive memo tailored for recruiter review. Focus on summarizing work experience, education, key skills, certifications, and notable achievements. Organize the CV into clear sections (Summary, Experience, Education, Skills, Certifications, Achievements) and present the information in a clean, recruiter-friendly format using concise bullet points. Only extract factual informations.",
        depth="standard",
        output_type="sourcedAnswer",
        include_images=False,
        include_domains=[url],
        include_inline_citations=False,
    )
    return response.answer

def pdf_to_markdown(pdf_path):
    from pypdf import PdfReader

    reader = PdfReader(pdf_path)
    markdown_content = []

    for page_num, page in enumerate(reader.pages, 1):
        text = page.extract_text()
        if text.strip():
            markdown_content.append(f"{text}\n\n")

    return "".join(markdown_content)

def generate_questions(model, job_offer, candidate_profile):

    messages = [
        {"role": "system", "content": "You are a proficient job interviewer. You are given a job offer and a candidate's resume. Your goal is to suggest relevant questions to the candidate to clarify his fit for the job."},
        {"role": "user", "content": "#Job offer : " + job_offer + "\n\n#Candidate profile : " + candidate_profile},
    ]

    for chunk in model.stream(messages):
        print(chunk.content, end="", flush=True)

    return model.stream(messages).answer

def generate_questions_online(model, context):
    messages = [
        {'role': 'system', 'content': 'You are a proficient job interviewer. You are given a job offer and a candidate\'s resume. Given a context, suggest three relevant questions to the candidate to clarify his fit for the job. You must return ONLY a Python array of three questions, without any other text.'},
        {'role': 'user', 'content': context},
    ]

    response = model.invoke(messages).content

    # Try to parse the response as a Python array
    try:
        # First, try to find array-like content in the response
        # Look for patterns like [...], ['...', '...'], etc.
        array_match = re.search(r'\[.*?\]', response, re.DOTALL)
        if array_match:
            array_str = array_match.group(0)
            # Use ast.literal_eval for safe parsing
            keywords = ast.literal_eval(array_str)
            if isinstance(keywords, list):
                return keywords
        
        # If no array found, try parsing the whole response
        keywords = ast.literal_eval(response.strip())
        if isinstance(keywords, list):
            return keywords
    except (ValueError, SyntaxError):
        # If parsing fails, try to extract keywords from text
        # Look for quoted strings that might be keywords
        questions = re.findall(r'["\']([^"\']+)["\']', response)
        if questions:
            return questions
    
    # Fallback: return as single-item list or empty list
    return [response.strip()] if response.strip() else []

    