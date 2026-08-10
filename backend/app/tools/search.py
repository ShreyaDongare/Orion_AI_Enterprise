import os
import logging

from langchain.tools import tool
from tavily import TavilyClient

logger = logging.getLogger(__name__)


@tool
def web_search(query: str) -> str:
    """
    Search the web using Tavily and return relevant
    results with titles, URLs, and content.
    """

    if not query or not query.strip():
        return "No search query was provided."

    api_key = os.getenv("TAVILY_API_KEY")

    if not api_key:
        logger.error("TAVILY_API_KEY is not configured.")

        return (
            "WEB_SEARCH_CONFIG_ERROR: "
            "TAVILY_API_KEY is not configured."
        )

    try:
        logger.info("Starting Tavily web search: %s", query)

        client = TavilyClient(
            api_key=api_key
        )

        response = client.search(
            query=query.strip(),
            search_depth="basic",
            max_results=5,
            include_answer=False,
            include_raw_content=False,
        )

        results = response.get("results", [])

        if not results:
            logger.warning(
                "No Tavily results found for: %s",
                query
            )

            return "No web search results were found."

        formatted_results = []

        for index, result in enumerate(results, start=1):

            title = result.get(
                "title",
                "Untitled"
            )

            url = result.get(
                "url",
                ""
            )

            content = result.get(
                "content",
                ""
            )

            formatted_results.append(
                f"""
Source {index}

Title:
{title}

URL:
{url}

Content:
{content}
"""
            )

        logger.info(
            "Tavily search completed successfully. "
            "Results: %d",
            len(results)
        )

        return "\n".join(formatted_results)

    except Exception as e:

        logger.error(
            "Tavily web search failed: %s",
            str(e),
            exc_info=True
        )

        return (
            "WEB_SEARCH_ERROR: "
            f"{str(e)}"
        )