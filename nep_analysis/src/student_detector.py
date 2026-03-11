import re


def detect_students(clean_text):

    students = []

    pattern = r'(\d{7}[\s\S]*?)(?=\n\d{7}|\Z)'

    matches = re.findall(pattern, clean_text)

    for block in matches:

        if re.search(r'\d{7}', block):

            students.append(block.strip())

    return students