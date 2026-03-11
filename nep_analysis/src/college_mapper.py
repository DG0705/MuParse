import re


def map_colleges(clean_text):

    college_map = {}

    college_pattern = r'(\d{4})\s*:\s*([A-Z\s\',\-]+COLLEGE[^\n]*)'

    colleges = list(re.finditer(college_pattern, clean_text))

    for college in colleges:

        code = college.group(1)
        name = college.group(2).strip()

        college_map[code] = name

    return college_map