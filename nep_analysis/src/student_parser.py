import re


def parse_student(block):

    data = {}

    # -------------------------
    # Seat Number
    # -------------------------
    seat = re.search(r'\b\d{7}\b', block)
    if seat:
        data["seat_no"] = seat.group()

    # -------------------------
    # Name
    # -------------------------
    name = re.search(r'\d{7}\s+([A-Z\s]+?)\s+Regular', block)
    if name:
        data["name"] = name.group(1).strip()

    # -------------------------
    # Gender
    # -------------------------
    gender = re.search(r'\b(MALE|FEMALE)\b', block)
    if gender:
        data["gender"] = gender.group()

    # -------------------------
    # College Code
    # -------------------------
    college_code = re.search(r'COLLEGE_CODE:(\d+)', block)
    if college_code:
        data["college_code"] = college_code.group(1)

    # -------------------------
    # College Name
    # -------------------------
    college_name = re.search(r'COLLEGE_NAME:(.*)', block)
    if college_name:
        data["college_name"] = college_name.group(1).strip()

    # -------------------------
    # Total Marks
    # -------------------------
    total = re.search(r'\(\s*(\d+)\s*\)', block)
    if total:
        data["total_marks"] = total.group(1)

    # -------------------------
    # Result
    # -------------------------
    result = re.search(r'\)\s*(PASS|FAILED)', block)
    if result:
        data["result"] = result.group(1)

    # -------------------------
    # Subject Marks
    # -------------------------
    tot_line = re.search(r'TOT\s+(.*)', block)

    if tot_line:

        tokens = tot_line.group(1).split()

        subject_marks = []

        i = 0

        while i < len(tokens):

            token = tokens[i]

            if token.replace('.', '').isdigit():

                mark = float(token)

                if 0 <= mark <= 125:

                    subject_marks.append(mark)

                    i += 5
                    continue

            i += 1

        data["subject_marks"] = subject_marks

        # SGPI
        if tokens:
            data["sgpi"] = tokens[-1]

    return data