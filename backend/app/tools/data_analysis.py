from langchain.tools import tool
import pandas as pd
import io
import logging

logger = logging.getLogger(__name__)

@tool
def analyze_csv_data(csv_content: str, query: str) -> str:
    """
    Analyzes CSV or tabular data provided as a string.
    The query should describe what kind of analysis is needed (e.g., 'What is the average of column X?', 'Summarize the data trends').
    """
    try:
        # We read the tabular string into a dataframe.
        # This assumes the string is formatted as CSV or markdown.
        # For simplicity, we try parsing it as CSV first.
        df = pd.read_csv(io.StringIO(csv_content))
        
        # A simple descriptive summary tool. In a real system, we'd use an LLM or pandas-ai for dynamic querying.
        # Here we return the basic stats and let the calling LLM reason over it.
        summary = f"Data Shape: {df.shape}\n"
        summary += f"Columns: {list(df.columns)}\n"
        summary += f"Summary Statistics:\n{df.describe(include='all').to_markdown()}\n"
        summary += f"First 5 Rows:\n{df.head(5).to_markdown()}\n"
        
        return summary
    except Exception as e:
        logger.error(f"Data analysis failed: {e}")
        return f"Error analyzing data: {str(e)}"
