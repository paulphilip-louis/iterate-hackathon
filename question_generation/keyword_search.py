from linkup import LinkupClient

client = LinkupClient(api_key="d37fb1a7-127f-411a-bdc9-5597a1828eb7")

def extract_keywords(model, text):
    messages = [
        {"role": "system", "content": "You must extract the technical keywords and entities that an interviewer might not know from the text you are given. You MUST return a Python array of keywords."},
        {"role": "user", "content": text},
    ]
    return model.invoke(messages).content

def search_def(client, keyword):
    response = client.search(
        query=f"You are a proficient pedagogue. You must explain in a single sentence the technical notion or entity {keyword} to a non-technical person. Your answer must be understandable in a few seconds. Return only the answer, no other text.",
        depth="standard",
        output_type="sourcedAnswer",
        include_images=False,
        include_inline_citations=False,
    )
    return response.answer