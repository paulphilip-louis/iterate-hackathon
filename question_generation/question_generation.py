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
        {'role': 'system', 'content': 'You are a proficient job interviewer. \
            Identify the last topic covered in the transcript and suggest ONE relevant question about it to the candidate to clarify his fit for the job. \
            Make use of the job offer, the company values and the candidate\'s resume for maximum relevance. \
            You must return ONLY the question, without any other text.'},
        {'role': 'user', 'content': context},
    ]

    response = model.invoke(messages).content
    
    return response

    