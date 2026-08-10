import re
import logging
from typing import Dict, Any

from app.agents.base_agent import BaseAgent
from app.prompts.agent_prompts import EMAIL_AGENT_PROMPT
from app.agents.memory import ConversationMemory

from langchain_core.output_parsers import StrOutputParser


logger = logging.getLogger(__name__)


class EmailAgent(BaseAgent):

    def __init__(self):
        super().__init__(agent_type="email")

        self.chain = (
            EMAIL_AGENT_PROMPT
            | self.llm
            | StrOutputParser()
        )

    # ============================================================
    # EXTRACT RECIPIENT
    # ============================================================

    def _extract_recipient(
        self,
        input_text: str,
        kwargs: Dict[str, Any]
    ) -> str:

        # 1. Prefer recipient explicitly provided
        #    by the frontend/backend.
        recipient = kwargs.get("recipient")

        if recipient:
            return str(recipient).strip()

        # 2. Try extracting an email address
        #    directly from the user's prompt.
        if input_text:

            match = re.search(
                r"[\w.+-]+@[\w-]+\.[\w.-]+",
                input_text
            )

            if match:
                return match.group(0)

        # 3. If no recipient was provided,
        #    keep the placeholder.
        return "[Recipient]"

    # ============================================================
    # EXTRACT SUBJECT
    # ============================================================

    def _extract_subject(
        self,
        response: str
    ) -> str:

        if not response:
            return "Untitled Email"

        # Look for:
        # Subject: ...
        match = re.search(
            r"(?im)^subject\s*:\s*(.+)$",
            response
        )

        if match:
            return match.group(1).strip()

        # Look for:
        # Subject
        # ...
        match = re.search(
            r"(?im)^subject\s*$\s*(.+)$",
            response
        )

        if match:
            return match.group(1).strip()

        # If the first line looks like a subject,
        # use it as a fallback.
        lines = [
            line.strip()
            for line in response.splitlines()
            if line.strip()
        ]

        if lines:
            first_line = lines[0]

            if len(first_line) <= 150:
                return first_line

        return "Untitled Email"

    # ============================================================
    # CLEAN EMAIL BODY
    # ============================================================

    def _clean_body(
        self,
        response: str,
        subject: str
    ) -> str:

        if not response:
            return ""

        body = response.strip()

        # Remove "Subject: ..." from the body
        body = re.sub(
            r"(?im)^subject\s*:\s*.+\n?",
            "",
            body,
            count=1
        )

        # If the response starts with the subject itself,
        # remove it from the body.
        if subject:
            body = re.sub(
                rf"^{re.escape(subject)}\s*\n+",
                "",
                body,
                count=1,
                flags=re.IGNORECASE
            )

        # Remove common formatting wrappers
        body = re.sub(
            r"^```(?:text|email)?\s*",
            "",
            body,
            flags=re.IGNORECASE
        )

        body = re.sub(
            r"\s*```$",
            "",
            body
        )

        return body.strip()

    # ============================================================
    # RUN EMAIL AGENT
    # ============================================================

    def run(
        self,
        input_text: str,
        conversation_id: str,
        **kwargs
    ) -> Dict[str, Any]:

        try:

            logger.info(
                "Email agent started | conversation=%s",
                conversation_id
            )

            # ====================================================
            # CONVERSATION HISTORY
            # ====================================================

            try:

                history = ConversationMemory.get_history(
                    conversation_id
                )

            except Exception as history_error:

                logger.warning(
                    "Could not load conversation history: %s",
                    str(history_error)
                )

                history = ""

            # ====================================================
            # GENERATE EMAIL
            # ====================================================

            response = self.chain.invoke(
                {
                    "input": input_text,
                    "history": history
                }
            )

            response = str(response).strip()

            # ====================================================
            # EXTRACT EMAIL INFORMATION
            # ====================================================

            subject = self._extract_subject(
                response
            )

            body = self._clean_body(
                response,
                subject
            )

            recipient = self._extract_recipient(
                input_text,
                kwargs
            )

            # ====================================================
            # LOG
            # ====================================================

            logger.info(
                "Email generated | subject=%s | recipient=%s",
                subject,
                recipient
            )

            # ====================================================
            # RETURN
            # ====================================================

            return {
                "response": response,

                "subject": subject,

                "recipient": recipient,

                "body": body,

                "status": "draft",

                "agent_used": "email"
            }

        except Exception as e:

            logger.error(
                "Email agent failed: %s",
                str(e),
                exc_info=True
            )

            return {
                "response": (
                    f"Error generating email: {str(e)}"
                ),

                "subject": "Email Generation Error",

                "recipient": self._extract_recipient(
                    input_text,
                    kwargs
                ),

                "body": "",

                "status": "failed",

                "agent_used": "email"
            }