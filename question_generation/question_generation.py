from typing import Any
import re
import ast
import json

from requests.models import Response
from langchain_core.messages import SystemMessage

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

async def generate_questions_beginning(model, context):

    messages = [
        {"role": "system", "content": """You are a proficient job interviewer.
            Suggest FIVE relevant introductory questions to the candidate to guide the interview in specific topics relevant to the job offer.
            Make use of the job offer, the company values and the candidate\'s resume for maximum relevance.
            KEEP THE QUESTIONS CONCISE AND TO THE POINT.
            
            CRITICAL OUTPUT FORMAT REQUIREMENTS:
            - Output EXACTLY five questions
            - Separate each question with the delimiter: " ||| "
            - Do NOT include numbering (no 1., 2., etc.)
            - Do NOT include any introductory text, explanations, or concluding remarks
            - Do NOT use newlines between questions
            - Your entire response must be ONLY the five questions separated by " ||| "
            - YOUR OUTPUT MUST BE IN ASCII CHARACTER SET. NO em-dash.
            Example format:
            Question one here? ||| Question two here? ||| Question three here? ||| Question four here? ||| Question five here?"""},
        {"role": "user", "content": context},
    ]

    response = model.invoke(messages).content

    questions = response.split('|||')
    questions = {i:question.strip() for i, question in enumerate(questions, start=1)}

    return json.dumps(questions)

async def generate_questions_online(model, context, transcript):
    messages = [
        SystemMessage(
            content=[
                {
                    "type": "text",
                    "text": """You are a proficient job interviewer. 
                    Identify the last topic covered in the transcript and suggest ONE relevant question about it to the candidate to clarify his fit for the job. 
                    Make use of the job offer, the company values and the candidate's resume for maximum relevance. 
                    You must return ONLY the question, without any other text. KEEP IT REALLY SHORT AND TO THE POINT.""",
                    "cache_control": {"type": "ephemeral"}  # CACHE THIS
                },
                {
                    "type": "text", 
                    "text": context,  # Job + values + resume
                    "cache_control": {"type": "ephemeral"}  # CACHE THIS
                }
            ]
        ),
        {
            "role": "user", 
            "content": f"TRANSCRIPT:\n{transcript}"  # Only this changes
        }
    ]

    response = model.invoke(messages).content
    
    return response

async def extract_keywords(model, text):
    messages = [
        {"role": "system", "content": """You must extract the technical keywords and entities that a non-technical recruiter might not know from the text you are given. 
        
        CRITICAL OUTPUT FORMAT REQUIREMENTS:
            - Separate each keyword with the delimiter: " ||| "
            - Do NOT include numbering (no 1., 2., etc.)
            - Do NOT include any introductory text, explanations, or concluding remarks
            - Do NOT use newlines between keywords
            - Your entire response must be ONLY the five questions separated by " ||| "
            - YOUR OUTPUT MUST BE IN ASCII CHARACTER SET. NO em-dash.
            Example format:
            Keyword1 ||| Keyword2 ||| Keyword3 ||| Keyword4"""},
        {"role": "user", "content": text},
    ]
    Response = model.invoke(messages).content

    keywords = Response.split('|||')
    keywords = [keyword.strip() for i, keyword in enumerate(keywords, start=1)]
    return keywords

