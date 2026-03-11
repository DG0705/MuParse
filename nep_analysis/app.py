import streamlit as st
import pandas as pd
import tempfile
import plotly.express as px
from streamlit_option_menu import option_menu

from src.pdf_reader import extract_text
from src.text_cleaner import clean_text
from src.student_detector import detect_students
from src.block_cleaner import clean_student_block
from src.student_parser import parse_student
from src.subject_extractor import extract_subjects


st.set_page_config(
    page_title="MU Result Analyzer",
    page_icon="📊",
    layout="wide"
)


# SIDEBAR MENU
with st.sidebar:

    selected = option_menu(
        "MU Result Analyzer",
        ["Dashboard", "Upload Result", "Analytics"],
        icons=["speedometer", "upload", "bar-chart"],
        default_index=0,
    )


# CACHE HEAVY PROCESS
@st.cache_data(show_spinner=False)
def process_pdf(pdf_path):

    raw_text = extract_text(pdf_path)

    cleaned_text = clean_text(raw_text)

    subjects = extract_subjects(cleaned_text)

    students = detect_students(cleaned_text)

    cleaned_blocks = []

    for block in students:
        cleaned_blocks.append(clean_student_block(block))

    parsed_students = []

    for block in cleaned_blocks:

        student = parse_student(block)

        marks = student.get("subject_marks", [])

        for i in range(min(len(subjects), len(marks))):
            student[subjects[i]] = marks[i]

        if "subject_marks" in student:
            del student["subject_marks"]

        parsed_students.append(student)

    df = pd.DataFrame(parsed_students)

    return df


# DASHBOARD PAGE
if selected == "Dashboard":

    st.title("📊 MU Result Analytics Dashboard")

    st.info("Upload a result PDF to begin analysis.")

    st.image(
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71",
        use_container_width=True
    )


# UPLOAD PAGE
elif selected == "Upload Result":

    st.title("Upload MU Result PDF")

    uploaded_file = st.file_uploader(
        "Upload Result PDF",
        type=["pdf"]
    )

    if uploaded_file:

        if st.button("Convert to CSV"):

            with tempfile.NamedTemporaryFile(delete=False) as tmp:
                tmp.write(uploaded_file.read())
                pdf_path = tmp.name

            progress = st.progress(0)
            status = st.empty()

            status.write("Processing PDF...")

            progress.progress(30)

            df = process_pdf(pdf_path)

            progress.progress(100)

            st.success("Conversion Complete")

            st.subheader("Result Table")

            st.dataframe(df, use_container_width=True)

            csv = df.to_csv(index=False).encode("utf-8")

            st.download_button(
                "Download CSV",
                csv,
                "mu_results.csv",
                "text/csv"
            )

            st.session_state["data"] = df


# ANALYTICS PAGE
elif selected == "Analytics":

    st.title("Result Analytics")

    if "data" not in st.session_state:

        st.warning("Upload a result PDF first.")

    else:

        df = st.session_state["data"]

        col1, col2, col3 = st.columns(3)

        col1.metric("Total Students", len(df))

        col2.metric("Average SGPI", round(df["sgpi"].astype(float).mean(), 2))

        col3.metric(
            "Top SGPI",
            df["sgpi"].astype(float).max()
        )

        st.subheader("SGPI Distribution")

        fig = px.histogram(
            df,
            x="sgpi",
            nbins=20,
            title="SGPI Distribution"
        )

        st.plotly_chart(fig, use_container_width=True)

        st.subheader("Subject Performance")

        subject_cols = df.columns[3:-1]

        averages = df[subject_cols].astype(float).mean()

        fig2 = px.bar(
            x=averages.index,
            y=averages.values,
            title="Average Marks per Subject"
        )

        st.plotly_chart(fig2, use_container_width=True)