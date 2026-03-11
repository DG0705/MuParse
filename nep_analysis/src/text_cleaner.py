import re

def clean_text(raw_text):

    text = raw_text

    # Remove University header lines
    text = re.sub(r'University Of Mumbai.*?\n', '', text)

    # Remove PAGE numbers
    text = re.sub(r'PAGE\s*:\s*\d+', '', text)

    # Remove grade table blocks
    text = re.sub(r'%Marks.*?GRADE POINT.*?\n', '', text, flags=re.S)

    # Remove legend blocks
    text = re.sub(r'@:O\.5042A.*?RR: RESERVED', '', text, flags=re.S)

    # 🔥 IMPORTANT: cut everything before first college
    match = re.search(r'\d{4}:\s+[A-Z].*?COLLEGE', text)

    if match:
        text = text[match.start():]

    # Remove multiple empty lines
    text = re.sub(r'\n\s*\n', '\n', text)

    return text