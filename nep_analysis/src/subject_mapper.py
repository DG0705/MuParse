import re


def extract_subject_codes(clean_text):

    pattern = r'(10\d{3})\s*:'

    codes = re.findall(pattern, clean_text)

    # remove duplicates
    unique_codes = []
    for c in codes:
        if c not in unique_codes:
            unique_codes.append(c)

    return unique_codes