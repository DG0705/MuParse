import re


def extract_subjects(clean_text):

    pattern = r'(10\d{3})\s*:'

    matches = re.findall(pattern, clean_text)

    subjects = []

    for code in matches:

        col = f"sub_{code}"

        if col not in subjects:
            subjects.append(col)

    return subjects