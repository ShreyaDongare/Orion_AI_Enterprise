from typing import Dict, Any, List
import logging
import re
import json

from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import PRESENTATION_AGENT_PROMPT
from app.agents.memory import ConversationMemory

from app.extensions import db
from app.models.core import Conversation, Project
from app.models.output import Presentation

from langchain_core.output_parsers import StrOutputParser


logger = logging.getLogger(__name__)


class PresentationAgent(BaseAgent):

    def __init__(self):
        super().__init__(
            agent_type="presentation"
        )

        # ====================================================
        # PRESENTATION GENERATION CHAIN
        # ====================================================

        self.chain = (
            PRESENTATION_AGENT_PROMPT
            | self.llm
            | StrOutputParser()
        )

    # ========================================================
    # RUN PRESENTATION AGENT
    # ========================================================

    def run(
        self,
        input_text: str,
        conversation_id: str,
        **kwargs
    ) -> Dict[str, Any]:

        try:

            logger.info(
                "Presentation request received | "
                "Conversation: %s",
                conversation_id
            )

            # =================================================
            # 1. GET CONVERSATION HISTORY
            # =================================================

            history = ConversationMemory.get_history(
                conversation_id
            )

            # =================================================
            # 2. GENERATE PRESENTATION
            # =================================================

            response = self.chain.invoke({
                "input": input_text,
                "history": history or [],
            })

            if not response or not str(response).strip():
                raise ValueError(
                    "Presentation agent generated empty content."
                )

            response = str(response).strip()

            logger.info(
                "Presentation generated successfully."
            )

            # =================================================
            # 3. FIND CONVERSATION
            # =================================================

            conversation = (
                Conversation.query
                .filter_by(
                    id=conversation_id
                )
                .first()
            )

            if not conversation:

                logger.error(
                    "Conversation not found: %s",
                    conversation_id
                )

                return {
                    "response": response,
                    "agent_used": "presentation",
                    "saved": False,
                    "save_error": (
                        "Conversation not found. "
                        "Presentation was generated but "
                        "could not be saved."
                    ),
                }

            # =================================================
            # 4. FIND PROJECT
            # =================================================

            project = (
                Project.query
                .filter_by(
                    id=conversation.project_id
                )
                .first()
            )

            if not project:

                logger.error(
                    "Project not found for conversation: %s",
                    conversation_id
                )

                return {
                    "response": response,
                    "agent_used": "presentation",
                    "saved": False,
                    "save_error": (
                        "Project not found. "
                        "Presentation was generated but "
                        "could not be saved."
                    ),
                }

            # =================================================
            # 5. CONVERT GENERATED TEXT INTO SLIDES
            # =================================================

            slides = self._parse_slides(
                response
            )

            # If the response cannot be parsed,
            # still preserve the complete generated
            # content inside slides_data.

            if not slides:

                slides = [
                    {
                        "title": "Generated Presentation",
                        "subtitle": "",
                        "bullets": [],
                        "content": response,
                    }
                ]

            slides_data = {
                "slides": slides,
                "raw_content": response,
            }

            # =================================================
            # 6. GENERATE DATABASE TITLE
            # =================================================

            title = self._generate_title(
                input_text
            )

            # =================================================
            # 7. CREATE PRESENTATION RECORD
            # =================================================

            presentation = Presentation(
                project_id=project.id,
                title=title,
                slides_data=slides_data,
                created_by=project.owner_id,
            )

            db.session.add(
                presentation
            )

            # =================================================
            # 8. SAVE TO POSTGRESQL
            # =================================================

            try:

                db.session.commit()

            except Exception as db_error:

                db.session.rollback()

                logger.error(
                    "Failed to save presentation: %s",
                    str(db_error),
                    exc_info=True,
                )

                return {
                    "response": response,
                    "agent_used": "presentation",
                    "saved": False,
                    "save_error": (
                        "Presentation was generated successfully, "
                        "but could not be saved to the database."
                    ),
                }

            logger.info(
                "Presentation saved successfully | "
                "Presentation ID: %s | "
                "Project ID: %s",
                presentation.id,
                project.id,
            )

            # =================================================
            # 9. RETURN GENERATED + SAVED PRESENTATION
            # =================================================

            return {
                "response": response,
                "agent_used": "presentation",
                "saved": True,
                "presentation_id": str(
                    presentation.id
                ),
                "project_id": str(
                    project.id
                ),
                "title": presentation.title,
                "slides": slides,
            }

        except Exception as e:

            logger.error(
                "Presentation agent failed: %s",
                str(e),
                exc_info=True,
            )

            return {
                "response": (
                    f'Error generating presentation: "{str(e)}"'
                ),
                "agent_used": "presentation",
                "saved": False,
            }

    # ========================================================
    # PARSE GENERATED PRESENTATION
    # ========================================================

    def _parse_slides(
        self,
        response: str
    ) -> List[Dict[str, Any]]:

        """
        Convert common presentation output formats
        into the JSON structure expected by the frontend.

        Supported examples:

        Slide 1: Title
        - Bullet one
        - Bullet two

        ## Slide 1: Title
        Subtitle
        - Bullet one
        """

        if not response:
            return []

        # ----------------------------------------------------
        # Try JSON first
        # ----------------------------------------------------

        cleaned = response.strip()

        if cleaned.startswith("```"):
            cleaned = re.sub(
                r"^```(?:json)?\s*",
                "",
                cleaned,
                flags=re.IGNORECASE
            )

            cleaned = re.sub(
                r"\s*```$",
                "",
                cleaned
            )

        try:

            parsed = json.loads(
                cleaned
            )

            if isinstance(parsed, list):
                return self._normalize_slide_list(
                    parsed
                )

            if (
                isinstance(parsed, dict)
                and isinstance(
                    parsed.get("slides"),
                    list
                )
            ):
                return self._normalize_slide_list(
                    parsed["slides"]
                )

        except (json.JSONDecodeError, TypeError):
            pass

        # ----------------------------------------------------
        # Parse text-based slides
        # ----------------------------------------------------

        slide_pattern = re.compile(
            r"(?im)^\s*(?:#+\s*)?"
            r"(?:slide\s*)?(\d+)\s*[:.)-]\s*(.+?)\s*$"
        )

        matches = list(
            slide_pattern.finditer(
                response
            )
        )

        if not matches:
            return []

        slides = []

        for index, match in enumerate(matches):

            title = match.group(2).strip()

            start = match.end()

            if index + 1 < len(matches):
                end = matches[index + 1].start()
            else:
                end = len(response)

            block = response[
                start:end
            ].strip()

            lines = [
                line.strip()
                for line in block.splitlines()
                if line.strip()
            ]

            bullets = []
            subtitle = ""
            content_lines = []

            for line in lines:

                # Markdown bullet
                if re.match(
                    r"^[-*•]\s+",
                    line
                ):
                    bullet = re.sub(
                        r"^[-*•]\s+",
                        "",
                        line
                    ).strip()

                    if bullet:
                        bullets.append(
                            bullet
                        )

                    continue

                # Numbered bullet
                if re.match(
                    r"^\d+[.)]\s+",
                    line
                ):
                    bullet = re.sub(
                        r"^\d+[.)]\s+",
                        "",
                        line
                    ).strip()

                    if bullet:
                        bullets.append(
                            bullet
                        )

                    continue

                # First normal line becomes subtitle
                if not subtitle:
                    subtitle = line
                else:
                    content_lines.append(
                        line
                    )

            slides.append({
                "title": title,
                "subtitle": subtitle,
                "bullets": bullets,
                "content": "\n".join(
                    content_lines
                ),
            })

        return slides

    # ========================================================
    # NORMALIZE JSON SLIDES
    # ========================================================

    def _normalize_slide_list(
        self,
        slides: List[Any]
    ) -> List[Dict[str, Any]]:

        normalized = []

        for slide in slides:

            if not isinstance(
                slide,
                dict
            ):
                continue

            bullets = slide.get(
                "bullets",
                []
            )

            if not isinstance(
                bullets,
                list
            ):
                bullets = [
                    str(bullets)
                ]

            normalized.append({
                "title": str(
                    slide.get(
                        "title",
                        ""
                    )
                ),

                "subtitle": str(
                    slide.get(
                        "subtitle",
                        ""
                    )
                ),

                "bullets": [
                    str(bullet)
                    for bullet in bullets
                ],

                "content": str(
                    slide.get(
                        "content",
                        ""
                    )
                ),
            })

        return normalized

    # ========================================================
    # GENERATE DATABASE TITLE
    # ========================================================

    def _generate_title(
        self,
        input_text: str
    ) -> str:

        """
        Generate a simple title without making
        another Gemini API call.
        """

        if not input_text:
            return "Generated AI Presentation"

        cleaned = " ".join(
            str(input_text)
            .strip()
            .split()
        )

        if len(cleaned) > 120:
            cleaned = (
                cleaned[:117]
                + "..."
            )

        return cleaned