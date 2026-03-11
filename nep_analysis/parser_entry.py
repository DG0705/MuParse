import sys
import json
from src.pdf_reader import extract_text
from src.student_detector import detect_students
from src.student_parser import parse_student

def run_extraction(pdf_path):
    text = extract_text(pdf_path)
    blocks = detect_students(text)
    results = [parse_student(b) for b in blocks]
    print(json.dumps(results)) # Node.js captures this output

if __name__ == "__main__":
    run_extraction(sys.argv[1])