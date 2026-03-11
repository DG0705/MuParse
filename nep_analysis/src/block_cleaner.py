import re


def clean_student_block(block):

    text = block

    # remove legend text
    text = re.sub(r'; C: CREDIT POINTS.*', '', text)

    # remove exam header
    text = re.sub(r'\( NEP 2020 \).*', '', text)

    # remove office register lines
    text = re.sub(r'OFFICE REGISTER.*', '', text)

    # remove repeated table headers
    text = re.sub(r'SEAT NO NAME STATUS GENDER ERN COLLEGE.*', '', text)

    # IMPORTANT: keep college info

    # cut everything after TOT line
    tot_match = re.search(r'TOT.*', text)

    if tot_match:
        text = text[:tot_match.end()]

    # remove extra spaces
    text = re.sub(r'\n\s*\n', '\n', text)

    return text.strip()