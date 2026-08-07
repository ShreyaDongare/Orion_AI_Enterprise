import os
import io
import mimetypes
import logging
from PyPDF2 import PdfReader
import fitz # PyMuPDF
from docx import Document as DocxDocument
import pandas as pd
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class InputNormalizer:
    @staticmethod
    def extract_text_from_file(file_path: str) -> Dict[str, Any]:
        """
        Takes a file path and returns extracted text and metadata.
        """
        if not os.path.exists(file_path):
            return {"error": "File not found", "text": ""}

        mime_type, _ = mimetypes.guess_type(file_path)
        ext = os.path.splitext(file_path)[1].lower()
        
        extracted_text = ""
        metadata = {"extension": ext, "mime_type": mime_type}

        try:
            if ext == '.pdf':
                extracted_text = InputNormalizer._extract_pdf(file_path)
            elif ext in ['.docx', '.doc']:
                extracted_text = InputNormalizer._extract_docx(file_path)
            elif ext == '.txt':
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    extracted_text = f.read()
            elif ext in ['.csv', '.xlsx', '.xls']:
                extracted_text = InputNormalizer._extract_spreadsheet(file_path, ext)
            else:
                metadata["warning"] = "Unsupported file format for text extraction."
        except Exception as e:
            logger.error(f"Error extracting text from {file_path}: {e}")
            metadata["error"] = str(e)
            
        return {
            "text": extracted_text,
            "metadata": metadata
        }

    @staticmethod
    def _extract_pdf(file_path: str) -> str:
        text = ""
        try:
            # Prefer PyMuPDF for better extraction
            doc = fitz.open(file_path)
            for page in doc:
                text += page.get_text()
        except Exception:
            # Fallback to PyPDF2
            reader = PdfReader(file_path)
            for page in reader.pages:
                text += (page.extract_text() or "") + "\n"
        return text

    @staticmethod
    def _extract_docx(file_path: str) -> str:
        doc = DocxDocument(file_path)
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])

    @staticmethod
    def _extract_spreadsheet(file_path: str, ext: str) -> str:
        if ext == '.csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        # Convert to markdown table format for better LLM comprehension
        return df.to_markdown(index=False)
