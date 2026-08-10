from typing import Dict, Any
import logging
import re

from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import REPORT_AGENT_PROMPT
from app.extensions import db
from app.models.output import Report
from app.models.core import Project

from langchain_core.output_parsers import StrOutputParser


logger = logging.getLogger(__name__)


class ReportAgent(BaseAgent):

    def __init__(self):

        super().__init__(
            agent_type="report"
        )

        # ----------------------------------------------------
        # Report generation chain
        # ----------------------------------------------------

        self.chain = (
            REPORT_AGENT_PROMPT
            | self.llm
            | StrOutputParser()
        )


    # ========================================================
    # RUN REPORT AGENT
    # ========================================================

    def run(
        self,
        input_text: str,
        conversation_id: str,
        **kwargs
    ) -> Dict[str, Any]:

        try:

            # =================================================
            # GENERATE REPORT
            # =================================================

            response = self.chain.invoke({
                "input": input_text
            })

            if not response:

                raise ValueError(
                    "Report agent returned empty content."
                )

            response = str(
                response
            ).strip()

            if not response:

                raise ValueError(
                    "Report agent returned empty content."
                )

            logger.info(
                "Report generated successfully | "
                "conversation=%s",
                conversation_id,
            )

            # =================================================
            # GET PROJECT ID
            # =================================================

            project_id = kwargs.get(
                "project_id"
            )

            report_id = None

            # =================================================
            # PERSIST REPORT
            # =================================================

            if project_id:

                try:

                    project_uuid = (
                        Project.query
                        .filter_by(
                            id=project_id
                        )
                        .first()
                    )

                except Exception:

                    project_uuid = None

                if not project_uuid:

                    logger.warning(
                        "Project %s not found. "
                        "Report was generated but "
                        "not persisted.",
                        project_id,
                    )

                else:

                    # -----------------------------------------
                    # Generate title from user request
                    # -----------------------------------------

                    title = (
                        self._generate_title(
                            input_text
                        )
                    )

                    # -----------------------------------------
                    # Create PostgreSQL report
                    # -----------------------------------------

                    report = Report(
                        project_id=project_uuid.id,
                        title=title,
                        content_markdown=response,
                    )

                    db.session.add(
                        report
                    )

                    db.session.commit()

                    report_id = str(
                        report.id
                    )

                    logger.info(
                        "Report persisted successfully | "
                        "report=%s | project=%s",
                        report_id,
                        project_id,
                    )

            else:

                logger.warning(
                    "No project_id supplied to ReportAgent. "
                    "Report will not be persisted."
                )

            # =================================================
            # RETURN RESULT
            # =================================================

            return {
                "response":
                    response,

                "report_id":
                    report_id,

                "sources": [],
            }

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Report agent failed: %s",
                str(e),
                exc_info=True,
            )

            return {
                "response": (
                    f'Error generating report: "{str(e)}"'
                ),

                "report_id":
                    None,

                "sources": [],
            }


    # ========================================================
    # GENERATE REPORT TITLE
    # ========================================================

    @staticmethod
    def _generate_title(
        input_text: str
    ) -> str:

        text = (
            input_text
            .strip()
            .replace(
                "\n",
                " "
            )
        )

        # ----------------------------------------------------
        # Normalize whitespace
        # ----------------------------------------------------

        text = re.sub(
            r"\s+",
            " ",
            text,
        )

        # ----------------------------------------------------
        # Remove common report instructions
        # ----------------------------------------------------

        text = re.sub(
            r"^(create|generate|write|prepare|make)\s+"
            r"(a|an|the)?\s*"
            r"(detailed|comprehensive|executive)?\s*"
            r"(report|analysis|briefing)"
            r"\s*(about|on|for)?\s*",
            "",
            text,
            flags=re.IGNORECASE,
        )

        # ----------------------------------------------------
        # Fallback title
        # ----------------------------------------------------

        if not text:

            return "Executive AI Report"

        # ----------------------------------------------------
        # Limit title length
        # ----------------------------------------------------

        if len(text) > 100:

            text = (
                text[:100]
                .rsplit(
                    " ",
                    1
                )[0]
            )

        return text.strip().title()