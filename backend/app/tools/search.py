from langchain.tools import tool
from langchain_community.utilities import DuckDuckGoSearchAPIWrapper
import logging

logger = logging.getLogger(__name__)

@tool
def web_search(query: str) -> str:
    """
    Search the web for the given query using DuckDuckGo.
    Returns a snippet of the top search results.
    Useful for finding up-to-date information, news, or general facts on the internet.
    """
    try:
        wrapper = DuckDuckGoSearchAPIWrapper(max_results=5)
        results = wrapper.run(query)
        return results if results else "No results found."
    except Exception as e:
        logger.error(f"Web search failed: {e}")
        return f"Error performing search: {str(e)}"
