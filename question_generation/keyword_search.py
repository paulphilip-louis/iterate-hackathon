async def search_def(model, keyword):

    messages = [
        {"role": "system", "content": """You are a proficient pedagogue. You must explain in a single sentence the technical notion or entity {keyword} to a non-technical person. Your answer must be understandable in a few seconds. Return only the answer, no other text."""},
        {"role": "user", "content": keyword},
    ]
    response = model.invoke(messages).content

    return response

async def extract_keywords_and_def(model, text):
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
    keywords = {keyword.strip():await search_def(model,keyword) for keyword in (keywords)}
    return keywords