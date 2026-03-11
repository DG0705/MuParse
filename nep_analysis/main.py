import re

from src.pdf_reader import extract_text
from src.text_cleaner import clean_text
from src.student_detector import detect_students
from src.block_cleaner import clean_student_block
from src.student_parser import parse_student
from src.subject_extractor import extract_subjects
from src.college_mapper import map_colleges
from src.csv_exporter import export_csv


def main():

    pdf_path = "data/input/sample_result.pdf"

    # STEP 1 — Extract text
    raw_text = extract_text(pdf_path)

    # STEP 2 — Clean text
    cleaned_text = clean_text(raw_text)

    # STEP 3 — Extract subject codes
    subjects = extract_subjects(cleaned_text)

    print("\nDetected Subjects:")
    print(subjects)

    # STEP 4 — Detect students
    students = detect_students(cleaned_text)

    print("\nTotal students detected:", len(students))

    # STEP 5 — Clean student blocks
    cleaned_blocks = []

    for block in students:
        cleaned_blocks.append(clean_student_block(block))

    print("\nCleaned First Student:\n")
    print(cleaned_blocks[0])

    # STEP 6 — Map colleges
    college_map = map_colleges(cleaned_text)

    # STEP 7 — Parse student data
    parsed_students = []

    for block in cleaned_blocks:

        student_data = parse_student(block)

        # --------------------------
        # Map subject marks
        # --------------------------
        marks = student_data.get("subject_marks", [])

        for i in range(min(len(subjects), len(marks))):
            student_data[subjects[i]] = marks[i]

        if "subject_marks" in student_data:
            del student_data["subject_marks"]

        # --------------------------
        # Detect college code
        # --------------------------
        college_match = re.search(r'(\d{4})\s*:', block)

        if college_match:

            code = college_match.group(1)

            student_data["college_code"] = code
            student_data["college_name"] = college_map.get(code, "")

        parsed_students.append(student_data)

    print("\nParsed Students:\n")

    for student in parsed_students:
        print(student)

    # STEP 8 — Export CSV
    export_csv(parsed_students, "data/output/results.csv")


if __name__ == "__main__":
    main()