import logging
from datetime import datetime

from flask.views import MethodView
from flask_smorest import Blueprint
from flask_jwt_extended import jwt_required
from sqlalchemy import text

from app.extensions import db


logger = logging.getLogger(__name__)


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

def get_token_usage_by_month():
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
                ORDER BY month ASC
            """)
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

def get_agent_performance():

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
                GROUP BY agent_type
                ORDER BY queries DESC
            """)
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

def get_platform_counts():

    tables = {
        "projects": "projects",
        "reports": "reports",
        "presentations": "presentations",
        "emails": "emails",
        "documents": "documents",
    }

    result = {}

    for key, table in tables.items():

        try:

            count = db.session.execute(
                text(
                    f'SELECT COUNT(*) FROM "{table}"'
                )
            ).scalar()

            result[key] = int(
                count or 0
            )

        except Exception as exc:

            logger.warning(
                "Unable to count %s: %s",
                table,
                exc
            )

            result[key] = 0

    return result


# ============================================================
# SUMMARY
# ============================================================

def get_summary():

    input_tokens, output_tokens = (
        get_token_totals()
    )

    total_tokens = (
        input_tokens +
        output_tokens
    )

    # --------------------------------------------------------
    # AVG LATENCY
    # --------------------------------------------------------

    try:

        avg_latency = db.session.execute(
            text("""
                SELECT
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
                    )
                FROM agent_executions
                WHERE started_at IS NOT NULL
                  AND completed_at IS NOT NULL
            """)
        ).scalar()

        avg_latency = number(
            avg_latency
        )

    except Exception:

        avg_latency = 0

    # --------------------------------------------------------
    # SUCCESS RATE
    # --------------------------------------------------------

    try:

        stats = db.session.execute(
            text("""
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (
                        WHERE status = 'completed'
                    ) AS completed
                FROM agent_executions
            """)
        ).mappings().first()

        total = int(
            stats["total"] or 0
        )

        completed = int(
            stats["completed"] or 0
        )

        success_rate = (
            (completed / total) * 100
            if total > 0
            else 0
        )

    except Exception:

        success_rate = 0

    return {
        "totalTokens": total_tokens,

        "avgLatency": round(
            avg_latency,
            2
        ),

        "retrievalAccuracy": round(
            success_rate,
            2
        ),

        # No fabricated business metrics.
        "monthlySavings": 0,

        "tokenChange": 0,
        "latencyChange": 0,
        "retrievalChange": 0,
        "roi": 0,
    }


# ============================================================
# ANALYTICS ENDPOINT
# ============================================================

@blp.route("")
class AnalyticsResource(MethodView):

    @jwt_required()
    def get(self):

        try:

            return {
                "summary": get_summary(),

                "tokenUsage":
                    get_token_usage_by_month(),

                "agentPerformance":
                    get_agent_performance(),

                "activity":
                    get_platform_counts(),

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