import logging
from datetime import datetime

from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from uuid import UUID
from sqlalchemy import text

from app.extensions import db


logger = logging.getLogger(__name__)


def _current_user_uuid():
    try:
        return UUID(str(get_jwt_identity()))
    except (ValueError, TypeError):
        from flask_smorest import abort
        abort(401, message="Invalid authenticated user.")


# ============================================================
# BLUEPRINT
# ============================================================

blp = Blueprint(
    "analytics",
    "analytics",
    url_prefix="/api/v1/analytics",
    description="OrionAI analytics operations",
)


# ============================================================
# HELPERS
# ============================================================

def number(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


# ============================================================
# TOKEN TOTAL
# ============================================================

def get_token_totals():
    try:
        row = db.session.execute(
            text("""
                SELECT
                    COALESCE(SUM(total_prompt_tokens), 0)
                        AS input_tokens,
                    COALESCE(SUM(total_completion_tokens), 0)
                        AS output_tokens
                FROM llm_key_usage
            """)
        ).mappings().first()

        input_tokens = int(
            number(row["input_tokens"])
        )

        output_tokens = int(
            number(row["output_tokens"])
        )

        return input_tokens, output_tokens

    except Exception as exc:
        logger.exception(
            "Failed to load token totals: %s",
            exc
        )
        return 0, 0


# ============================================================
# TOKEN CHART DATA
# ============================================================

def get_token_usage_by_month(user_uuid):
    """
    Prefer real historical analytics events.

    If no historical events exist yet, use the real
    aggregate token usage from llm_key_usage for the
    current month.

    No mock/fake values are generated.
    """

    try:

        rows = db.session.execute(
            text("""
                SELECT
                    DATE_TRUNC(
                        'month',
                        created_at
                    ) AS month,
                    event_data
                FROM analytics
                WHERE event_type = 'llm_token_usage'
                  AND user_id = :user_id
                ORDER BY month ASC
            """), {"user_id": user_uuid}
        ).mappings().all()

        # ----------------------------------------------------
        # HISTORICAL EVENTS AVAILABLE
        # ----------------------------------------------------

        if rows:

            monthly = {}

            import json

            for row in rows:

                data = row["event_data"]

                if isinstance(data, str):
                    try:
                        data = json.loads(data)
                    except Exception:
                        continue

                if not isinstance(data, dict):
                    continue

                input_tokens = int(
                    number(
                        data.get(
                            "input_tokens",
                            data.get(
                                "prompt_tokens",
                                0
                            )
                        )
                    )
                )

                output_tokens = int(
                    number(
                        data.get(
                            "output_tokens",
                            data.get(
                                "completion_tokens",
                                0
                            )
                        )
                    )
                )

                month = row["month"]

                if month not in monthly:
                    monthly[month] = {
                        "inputTokens": 0,
                        "outputTokens": 0,
                    }

                monthly[month][
                    "inputTokens"
                ] += input_tokens

                monthly[month][
                    "outputTokens"
                ] += output_tokens

            result = []

            for month in sorted(monthly):

                result.append({
                    "month": month.strftime("%b"),
                    "inputTokens": monthly[month][
                        "inputTokens"
                    ],
                    "outputTokens": monthly[month][
                        "outputTokens"
                    ],
                })

            return result

        # ----------------------------------------------------
        # NO EVENTS YET
        # USE REAL AGGREGATED CURRENT MONTH DATA
        # ----------------------------------------------------

        input_tokens, output_tokens = (
            get_token_totals()
        )

        total = (
            input_tokens +
            output_tokens
        )

        if total == 0:
            return []

        return [{
            "month": datetime.utcnow().strftime("%b"),
            "inputTokens": input_tokens,
            "outputTokens": output_tokens,
        }]

    except Exception as exc:

        logger.exception(
            "Failed to load token chart data: %s",
            exc
        )

        return []


# ============================================================
# AGENT PERFORMANCE
# ============================================================

def get_agent_performance(user_uuid):

    try:

        rows = db.session.execute(
            text("""
                SELECT
                    agent_type,
                    COUNT(*) AS queries,
                    COALESCE(
                        AVG(
                            EXTRACT(
                                EPOCH FROM (
                                    completed_at -
                                    started_at
                                )
                            )
                        ),
                        0
                    ) AS avg_latency
                FROM agent_executions
                WHERE started_at IS NOT NULL
                  AND completed_at IS NOT NULL
                  AND user_id = :user_id
                GROUP BY agent_type
                ORDER BY queries DESC
            """), {"user_id": user_uuid}
        ).mappings().all()

        result = []

        for row in rows:

            result.append({
                "agent": (
                    row["agent_type"]
                    or "Unknown"
                ),
                "queries": int(
                    row["queries"] or 0
                ),
                "avgTime": round(
                    number(row["avg_latency"]),
                    3
                ),
            })

        return result

    except Exception as exc:

        logger.exception(
            "Failed to load agent performance: %s",
            exc
        )

        return []


# ============================================================
# PLATFORM COUNTS
# ============================================================

def get_platform_counts(user_uuid):
    """Counts visible to the current user only."""
    from app.models.core import Project, Conversation
    from app.models.knowledge import KnowledgeCollection, Document
    from app.models.output import Report, Presentation, Email

    project_ids = db.session.query(Project.id).filter(Project.owner_id == user_uuid).subquery()
    collection_ids = db.session.query(KnowledgeCollection.id).filter(KnowledgeCollection.owner_id == user_uuid).subquery()
    return {
        "projects": Project.query.filter(Project.owner_id == user_uuid).count(),
        "reports": Report.query.filter(Report.project_id.in_(project_ids)).count(),
        "presentations": Presentation.query.filter(Presentation.project_id.in_(project_ids)).count(),
        "emails": Email.query.filter(Email.sender_id == user_uuid).count(),
        "documents": Document.query.filter(Document.collection_id.in_(collection_ids)).count(),
    }


# SUMMARY
# ============================================================

def get_summary(user_uuid):
    """Return the existing dashboard summary schema, scoped to one user."""
    from app.models.system import AgentExecution

    executions = AgentExecution.query.filter(AgentExecution.user_id == user_uuid)
    total = executions.count()
    completed = executions.filter(AgentExecution.status == "completed").count()
    success_rate = (completed / total * 100) if total else 0

    try:
        avg_latency = db.session.execute(
            text("""
                SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)
                FROM agent_executions
                WHERE user_id = :user_id
                  AND started_at IS NOT NULL
                  AND completed_at IS NOT NULL
            """), {"user_id": user_uuid}
        ).scalar()
        avg_latency = number(avg_latency)
    except Exception:
        logger.exception("Failed to calculate user-scoped average latency")
        avg_latency = 0

    # Only count token events associated with this user. Global API-key totals
    # are intentionally not presented as personal usage.
    input_tokens = 0
    output_tokens = 0
    try:
        rows = db.session.execute(
            text("""
                SELECT event_data FROM analytics
                WHERE event_type = 'llm_token_usage'
                  AND user_id = :user_id
            """), {"user_id": user_uuid}
        ).mappings().all()
        import json
        for row in rows:
            data = row["event_data"]
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except Exception:
                    continue
            if isinstance(data, dict):
                input_tokens += int(number(data.get("input_tokens", data.get("prompt_tokens", 0))))
                output_tokens += int(number(data.get("output_tokens", data.get("completion_tokens", 0))))
    except Exception:
        logger.exception("Failed to calculate user-scoped token totals")

    return {
        "totalTokens": input_tokens + output_tokens,
        "avgLatency": round(avg_latency, 2),
        "retrievalAccuracy": round(success_rate, 2),
        "monthlySavings": 0,
        "tokenChange": 0,
        "latencyChange": 0,
        "retrievalChange": 0,
        "roi": 0,
    }


@blp.route("")
class AnalyticsResource(MethodView):

    @jwt_required()
    def get(self):

        try:

            return {
                "summary": get_summary(_current_user_uuid()),

                "tokenUsage":
                    get_token_usage_by_month(_current_user_uuid()),

                "agentPerformance":
                    get_agent_performance(_current_user_uuid()),

                "activity":
                    get_platform_counts(_current_user_uuid()),

                "generatedAt":
                    datetime.utcnow().isoformat(),
            }, 200

        except Exception as exc:

            logger.exception(
                "Analytics endpoint failed: %s",
                exc
            )

            return {
                "message":
                    "Unable to generate analytics.",

                "error":
                    str(exc),
            }, 500