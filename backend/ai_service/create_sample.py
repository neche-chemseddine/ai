from fpdf import FPDF

def create_pdf(filename):
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(0, 10, "John Doe - Senior Software Engineer", ln=True, align='C')
    pdf.ln(10)
    
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "Professional Summary", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 10, "Experience building scalable microservices with Python, FastAPI, and NestJS. Expert in Docker, Kubernetes, and AWS.")
    
    pdf.ln(5)
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "Experience", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 10, "- Senior Engineer at CloudTech (2020-Present): Led the migration of a legacy monolith to FastAPI microservices. Optimized PostgreSQL queries reducing latency by 40%.\n- Backend Developer at DevWorks (2018-2020): Built RESTful APIs using Node.js and Express. Implemented Redis caching.")
    
    pdf.ln(5)
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, "Skills", ln=True)
    pdf.set_font("Arial", '', 11)
    pdf.multi_cell(0, 10, "Python, FastAPI, Node.js, NestJS, PostgreSQL, Redis, Docker, Kubernetes, AWS, CI/CD, Git.")
    
    pdf.output(filename)

if __name__ == "__main__":
    create_pdf("sample.pdf")
    print("sample.pdf created.")
