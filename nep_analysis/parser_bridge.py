import sys
import os
import json

# --- THE FIX: Force Python to recognize the current directory for imports ---
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Now Python will successfully find your 'src' folder
from src.pdf_reader import extract_text
from src.student_detector import detect_students
from src.student_parser import parse_student
from src.subject_extractor import extract_subjects

def main(pdf_path):
    try:
        if not os.path.exists(pdf_path):
            print(json.dumps({"error": "File not found"}))
            return

        raw_text = extract_text(pdf_path)
        subjects = extract_subjects(raw_text)
        student_blocks = detect_students(raw_text)
        
        parsed_results = []
        for block in student_blocks:
            student = parse_student(block)
            marks = student.get("subject_marks", [])
            
            # Map subjects to marks dynamically
            subject_data = {}
            for i in range(min(len(subjects), len(marks))):
                subject_data[subjects[i]] = marks[i]
            
            student["subjects"] = subject_data
            if "subject_marks" in student:
                del student["subject_marks"]
            
            parsed_results.append(student)

        # Output JSON to stdout for Node.js to capture
        print(json.dumps(parsed_results))

    except Exception as e:
        print(json.dumps({"error": str(e)}))

if __name__ == "__main__":
    if len(sys.argv) > 1:
        main(sys.argv[1])