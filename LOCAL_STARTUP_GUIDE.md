# OrionAI Enterprise - Local Startup Guide (No Docker)

This guide provides step-by-step instructions on how to set up, configure, and run the OrionAI Enterprise backend **entirely locally without Docker**.

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Python 3.10+**: [Download Python](https://www.python.org/downloads/)
- **PostgreSQL 14+**: [Download PostgreSQL](https://www.postgresql.org/download/)
- **Git**: (Optional, but recommended)

*Note on ChromaDB*: ChromaDB is typically run via Docker, but it can run entirely in-process within your Python environment or as a standalone FastAPI server locally. We will configure it to run locally via Python in this guide.

---

## 2. Set Up the Database (PostgreSQL)

Since we are not using Docker, you need to manually create the PostgreSQL database and user.

1. Open your terminal or command prompt.
2. Log into the PostgreSQL interactive terminal (`psql`) using the default `postgres` superuser (you will be prompted for the password you set during installation):
   ```bash
   psql -U postgres
   ```
3. Inside the `psql` prompt, run the following SQL commands to create the database and user:
   ```sql
   -- Create the database
   CREATE DATABASE orionai;

   -- (Optional) If you want to use a specific user other than 'postgres':
   CREATE USER orion_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE orionai TO orion_user;
   
   -- Type \q to exit psql
   \q
   ```

---

## 3. Clone and Set Up the Python Environment

1. Navigate to the backend directory:
   ```bash
   cd d:\Shreya_Client\ORION_AI_SYSTEM\backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - **Windows**:
     ```cmd
     venv\Scripts\activate
     ```
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```
4. Install all Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

---

## 4. Configure the Environment Variables

1. Make a copy of the `.env.example` file and rename it to `.env`:
   - **Windows**: `copy .env.example .env`
   - **macOS/Linux**: `cp .env.example .env`

2. Open the `.env` file in your text editor and update the variables:

   ```env
   # Update this to match the local PostgreSQL credentials you created in Step 2.
   # Format: postgresql://<username>:<password>@localhost:5432/<database_name>
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orionai

   # Security (You can leave these as-is for local development)
   SECRET_KEY=super-secret-key-change-in-production
   JWT_SECRET_KEY=super-secret-jwt-key-change-in-production

   # Gemini API Keys (Required for AI Agents to work)
   # Get a key from Google AI Studio: https://aistudio.google.com/
   GEMINI_API_KEY_1=your_actual_gemini_api_key_here
   
   # ChromaDB Settings
   # To run Chroma locally in-memory/on-disk (instead of via HTTP), 
   # you can remove CHROMA_HOST and CHROMA_PORT from the .env or ignore them.
   # The code will default to HTTP mode, but you can run a local Chroma server.

   # Email Settings (For testing the Email Agent)
   SMTP_SERVER=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USERNAME=your_gmail_address@gmail.com
   SMTP_PASSWORD=your_google_app_password
   SENDER_EMAIL=your_gmail_address@gmail.com

   # Local Storage
   STORAGE_PATH=./storage/files
   ```

---

## 5. Run a Local ChromaDB Server (Optional but Recommended)

By default, the backend (`app/rag/chroma_client.py`) attempts to connect to a ChromaDB server on `localhost:8000` via the HTTP Client. 

Since you aren't using Docker, you can spin up the ChromaDB server locally in a separate terminal:

1. Open a **new terminal window**.
2. Navigate to the backend directory and activate your virtual environment:
   ```bash
   cd d:\Shreya_Client\ORION_AI_SYSTEM\backend
   venv\Scripts\activate
   ```
3. Run the Chroma server directly using the CLI:
   ```bash
   chroma run --path ./chroma_local_data
   ```
   *This will start the vector database on `http://localhost:8000` and save data to the `chroma_local_data` folder on your hard drive.*

*(Leave this terminal running in the background).*

---

## 6. Initialize the Database Schema

With PostgreSQL running and your `.env` configured, it's time to create the tables.

In your **original terminal** (where the virtual environment is activated), run the database setup script:

```bash
python scripts/setup_db.py
```

**Expected Output:**
```text
Database initialized successfully.
Created default user: test@example.com / password123
```
*Note: This script safely creates all tables based on the SQLAlchemy models and seeds a default test user.*

---

## 7. Start the Application Server

You are now ready to start the backend!

```bash
python run.py
```

**Expected Output:**
```text
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:5000
```

---

## 8. Verifying the Setup

1. **Check the API Health**: Open your browser and go to `http://localhost:5000/health`. You should see `{"status": "healthy"}`.
2. **View Swagger Documentation**: Go to `http://localhost:5000/api/v1/docs` to see the interactive REST API interface.
3. **Test Database & Authentication**: 
   - Open Postman, Curl, or the Swagger UI.
   - Make a `POST` request to `/api/v1/auth/login` with:
     ```json
     {
       "email": "test@example.com",
       "password": "password123"
     }
     ```
   - You should receive an `access_token` and `refresh_token`.

---

## Troubleshooting

- **Psycopg2 / PostgreSQL Connection Refused**: Ensure the PostgreSQL service is actually running on your machine (Check Windows Services or run `pg_isready` on Mac/Linux).
- **Authentication failed for user "postgres"**: Double-check the password in your `DATABASE_URL` matches what you set during installation.
- **ChromaDB Connection Error**: Ensure you followed Step 5 to run `chroma run` in a separate terminal, otherwise the `HttpClient` in `chroma_client.py` will fail to connect.
