# OrionAI Enterprise Backend

This is the backend repository for OrionAI Enterprise. It is built using Flask, SQLAlchemy, LangChain, and PostgreSQL.

## Prerequisites
- Python 3.10+
- Docker & Docker Compose (for PostgreSQL and ChromaDB)

## Local Setup Instructions

1. **Clone & Virtual Environment**
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Unix:
   source venv/bin/activate
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Configuration**
   Copy `.env.example` to `.env` and fill in your Gemini API keys and Google SMTP credentials.
   ```bash
   cp .env.example .env
   ```

4. **Start Infrastructure (Database & Vector DB)**
   Ensure Docker is running, then execute:
   ```bash
   docker-compose up -d
   ```

5. **Initialize Database**
   This script creates the necessary tables and a mock user (`test@example.com` / `password123`) for testing.
   ```bash
   python scripts/setup_db.py
   ```

6. **Run the Application**
   ```bash
   python run.py
   ```
   The API will be available at `http://localhost:5000`.
   Swagger documentation is available at `http://localhost:5000/api/v1/docs`.

## Key Architectural Decisions
- **LLM Manager**: Handles multiple Gemini API keys in a round-robin format with automatic retries for rate-limiting.
- **Multi-Agent System**: Utilizes LangChain to dynamically route user input to specialized agents (Research, Report, Data Analysis, etc.).
- **Background Tasks**: Celery has been replaced by Python's `concurrent.futures.ThreadPoolExecutor` for a simpler, dependency-free background execution within the Flask app context.
- **RAG Pipeline**: Embedded documents are chunked and stored in ChromaDB (running via Docker).
- **Email**: Uses Google SMTP to send emails.
