import os
import re
import logging
from uuid import UUID

from flask import send_file
from flask.views import MethodView
from flask_smorest import Blueprint, abort
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.extensions import db
from app.models.output import Report
from app.models.core import Project


logger = logging.getLogger(__name__)


# ============================================================
# REPORT BLUEPRINT
# ============================================================

blp = Blueprint(
    "reports",
    "reports",
    url_prefix="/api/v1/reports",
    description="Report management operations",
)


# ============================================================
# SERIALIZE REPORT
# ============================================================

def serialize_report(report):
    return {
        "id": str(report.id),

        "project_id": (
            str(report.project_id)
            if report.project_id
            else None
        ),

        "title": report.title or "",

        "content_markdown": (
            report.content_markdown or ""
        ),

        "file_path": (
            report.file_path
            if report.file_path
            else None
        ),

        "created_by": (
            str(report.created_by)
            if report.created_by
            else None
        ),

        "created_at": (
            report.created_at.isoformat()
            if report.created_at
            else None
        ),
    }


# ============================================================
# AUTHENTICATED USER
# ============================================================

def get_current_user_uuid():

    user_id = get_jwt_identity()

    if not user_id:
        abort(
            401,
            message="Authentication required.",
        )

    try:
        return UUID(str(user_id))

    except (
        ValueError,
        TypeError,
    ):

        abort(
            401,
            message="Invalid authenticated user.",
        )


# ============================================================
# FIND USER'S REPORT
# ============================================================

def get_owned_report(
    report_id,
    user_uuid,
):

    try:
        report_uuid = UUID(
            str(report_id)
        )

    except (
        ValueError,
        TypeError,
    ):

        abort(
            422,
            message="Invalid report_id.",
        )

    report = (
        Report.query
        .join(
            Project,
            Report.project_id == Project.id,
        )
        .filter(
            Report.id == report_uuid,
            Project.owner_id == user_uuid,
        )
        .first()
    )

    if not report:

        abort(
            404,
            message="Report not found.",
        )

    return report


# ============================================================
# SAFE FILE NAME
# ============================================================

def make_safe_filename(title):

    title = title or "OrionAI_Report"

    safe_title = re.sub(
        r"[^a-zA-Z0-9_\- ]",
        "",
        str(title),
    )

    safe_title = re.sub(
        r"\s+",
        "_",
        safe_title,
    )

    safe_title = safe_title.strip("_")

    if not safe_title:
        safe_title = "OrionAI_Report"

    return safe_title[:100]


# ============================================================
# REPORT STORAGE
# ============================================================

def get_report_storage_directory():

    storage_root = os.getenv(
        "STORAGE_PATH",
        "storage",
    )

    report_directory = os.path.join(
        storage_root,
        "reports",
    )

    os.makedirs(
        report_directory,
        exist_ok=True,
    )

    return os.path.abspath(
        report_directory
    )


# ============================================================
# PDF TEXT ESCAPING
# ============================================================

def escape_pdf_text(text):

    if text is None:
        return ""

    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def format_inline_markdown(text):

    text = escape_pdf_text(text)

    # Bold
    text = re.sub(
        r"\*\*(.*?)\*\*",
        r"<b>\1</b>",
        text,
    )

    # Italic
    text = re.sub(
        r"\*(.*?)\*",
        r"<i>\1</i>",
        text,
    )

    return text


# ============================================================
# PDF GENERATION
# ============================================================

def generate_report_pdf(report):

    """
    Convert the report's stored Markdown content into
    a professional PDF.

    The generated file is saved to:

        STORAGE_PATH/reports/

    and the path is stored in report.file_path.
    """

    # ========================================================
    # IMPORT REPORTLAB
    # ========================================================

    try:

        from reportlab.lib import colors

        from reportlab.lib.enums import (
            TA_LEFT,
            TA_CENTER,
        )

        from reportlab.lib.pagesizes import A4

        from reportlab.lib.styles import (
            getSampleStyleSheet,
            ParagraphStyle,
        )

        from reportlab.lib.units import mm

        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            Table,
            TableStyle,
        )

    except Exception as e:

        logger.error(
            "ReportLab import failed: %s",
            str(e),
            exc_info=True,
        )

        raise RuntimeError(
            "ReportLab could not be imported. "
            "Run: pip install reportlab"
        ) from e

    # ========================================================
    # STORAGE
    # ========================================================

    report_directory = (
        get_report_storage_directory()
    )

    safe_title = make_safe_filename(
        report.title
    )

    filename = (
        f"{safe_title}_"
        f"{str(report.id)[:8]}.pdf"
    )

    file_path = os.path.join(
        report_directory,
        filename,
    )

    # ========================================================
    # STYLES
    # ========================================================

    styles = getSampleStyleSheet()

    brand_style = ParagraphStyle(
        "OrionBrand",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor(
            "#2563EB"
        ),
        spaceAfter=8,
    )

    title_style = ParagraphStyle(
        "OrionTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=28,
        alignment=TA_LEFT,
        textColor=colors.HexColor(
            "#0F172A"
        ),
        spaceAfter=16,
    )

    heading_style = ParagraphStyle(
        "OrionHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=20,
        textColor=colors.HexColor(
            "#1D4ED8"
        ),
        spaceBefore=16,
        spaceAfter=8,
    )

    subheading_style = ParagraphStyle(
        "OrionSubHeading",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=17,
        textColor=colors.HexColor(
            "#2563EB"
        ),
        spaceBefore=10,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "OrionBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=16,
        textColor=colors.HexColor(
            "#334155"
        ),
        spaceAfter=8,
    )

    bullet_style = ParagraphStyle(
        "OrionBullet",
        parent=body_style,
        leftIndent=16,
        firstLineIndent=-9,
        leading=15,
        spaceAfter=5,
    )

    # ========================================================
    # DOCUMENT
    # ========================================================

    document = SimpleDocTemplate(
        file_path,
        pagesize=A4,

        rightMargin=20 * mm,
        leftMargin=20 * mm,

        topMargin=24 * mm,
        bottomMargin=20 * mm,

        title=(
            report.title
            or "OrionAI Executive Report"
        ),

        author="OrionAI",
    )

    story = []

    # ========================================================
    # BRAND
    # ========================================================

    story.append(
        Paragraph(
            "ORION AI",
            brand_style,
        )
    )

    # ========================================================
    # TITLE
    # ========================================================

    story.append(
        Paragraph(
            escape_pdf_text(
                report.title
                or "Executive AI Report"
            ),
            title_style,
        )
    )

    # ========================================================
    # METADATA
    # ========================================================

    created_at = "N/A"

    if report.created_at:

        created_at = (
            report.created_at.strftime(
                "%d %B %Y, %H:%M"
            )
        )

    metadata = [
        [
            Paragraph(
                "<b>Generated</b>",
                body_style,
            ),
            Paragraph(
                escape_pdf_text(
                    created_at
                ),
                body_style,
            ),
        ],

        [
            Paragraph(
                "<b>Project</b>",
                body_style,
            ),
            Paragraph(
                escape_pdf_text(
                    str(report.project_id)
                ),
                body_style,
            ),
        ],

        [
            Paragraph(
                "<b>Platform</b>",
                body_style,
            ),
            Paragraph(
                "OrionAI Enterprise AI",
                body_style,
            ),
        ],
    ]

    metadata_table = Table(
        metadata,
        colWidths=[
            35 * mm,
            130 * mm,
        ],
    )

    metadata_table.setStyle(
        TableStyle(
            [
                (
                    "BACKGROUND",
                    (0, 0),
                    (0, -1),
                    colors.HexColor(
                        "#EFF6FF"
                    ),
                ),

                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.HexColor(
                        "#DBEAFE"
                    ),
                ),

                (
                    "VALIGN",
                    (0, 0),
                    (-1, -1),
                    "TOP",
                ),

                (
                    "LEFTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),

                (
                    "RIGHTPADDING",
                    (0, 0),
                    (-1, -1),
                    8,
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    6,
                ),
            ]
        )
    )

    story.append(
        metadata_table
    )

    story.append(
        Spacer(
            1,
            15,
        )
    )

    # ========================================================
    # REPORT CONTENT
    # ========================================================

    markdown = (
        report.content_markdown
        or ""
    )

    if not markdown.strip():

        story.append(
            Paragraph(
                "No report content available.",
                body_style,
            )
        )

    else:

        lines = markdown.splitlines()

        for raw_line in lines:

            line = raw_line.strip()

            if not line:

                story.append(
                    Spacer(
                        1,
                        5,
                    )
                )

                continue

            # ------------------------------------------------
            # H1
            # ------------------------------------------------

            if line.startswith("# "):

                text = line[2:].strip()

                story.append(
                    Paragraph(
                        format_inline_markdown(
                            text
                        ),
                        title_style,
                    )
                )

                continue

            # ------------------------------------------------
            # H2
            # ------------------------------------------------

            if line.startswith("## "):

                text = line[3:].strip()

                story.append(
                    Paragraph(
                        format_inline_markdown(
                            text
                        ),
                        heading_style,
                    )
                )

                continue

            # ------------------------------------------------
            # H3
            # ------------------------------------------------

            if line.startswith("### "):

                text = line[4:].strip()

                story.append(
                    Paragraph(
                        format_inline_markdown(
                            text
                        ),
                        subheading_style,
                    )
                )

                continue

            # ------------------------------------------------
            # MARKDOWN TABLE SEPARATOR
            # ------------------------------------------------

            if re.match(
                r"^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$",
                line,
            ):

                continue

            # ------------------------------------------------
            # TABLE ROW
            # ------------------------------------------------

            if (
                line.startswith("|")
                and line.endswith("|")
            ):

                cells = [
                    cell.strip()
                    for cell in line[
                        1:-1
                    ].split("|")
                ]

                cells = [
                    format_inline_markdown(
                        cell
                    )
                    for cell in cells
                ]

                table = Table(
                    [
                        [
                            Paragraph(
                                cell,
                                body_style,
                            )
                            for cell in cells
                        ]
                    ],
                    repeatRows=1,
                )

                table.setStyle(
                    TableStyle(
                        [
                            (
                                "GRID",
                                (0, 0),
                                (-1, -1),
                                0.5,
                                colors.HexColor(
                                    "#CBD5E1"
                                ),
                            ),

                            (
                                "BACKGROUND",
                                (0, 0),
                                (-1, -1),
                                colors.HexColor(
                                    "#F8FAFC"
                                ),
                            ),

                            (
                                "VALIGN",
                                (0, 0),
                                (-1, -1),
                                "TOP",
                            ),

                            (
                                "LEFTPADDING",
                                (0, 0),
                                (-1, -1),
                                6,
                            ),

                            (
                                "RIGHTPADDING",
                                (0, 0),
                                (-1, -1),
                                6,
                            ),

                            (
                                "TOPPADDING",
                                (0, 0),
                                (-1, -1),
                                5,
                            ),

                            (
                                "BOTTOMPADDING",
                                (0, 0),
                                (-1, -1),
                                5,
                            ),
                        ]
                    )
                )

                story.append(
                    table
                )

                story.append(
                    Spacer(
                        1,
                        8,
                    )
                )

                continue

            # ------------------------------------------------
            # BULLET
            # ------------------------------------------------

            if (
                line.startswith("- ")
                or line.startswith("* ")
            ):

                text = line[2:].strip()

                story.append(
                    Paragraph(
                        "• "
                        + format_inline_markdown(
                            text
                        ),
                        bullet_style,
                    )
                )

                continue

            # ------------------------------------------------
            # NUMBERED LIST
            # ------------------------------------------------

            numbered_match = re.match(
                r"^(\d+)\.\s+(.*)",
                line,
            )

            if numbered_match:

                number = (
                    numbered_match.group(1)
                )

                text = (
                    numbered_match.group(2)
                )

                story.append(
                    Paragraph(
                        f"{number}. "
                        f"{format_inline_markdown(text)}",
                        body_style,
                    )
                )

                continue

            # ------------------------------------------------
            # NORMAL PARAGRAPH
            # ------------------------------------------------

            story.append(
                Paragraph(
                    format_inline_markdown(
                        line
                    ),
                    body_style,
                )
            )

    # ========================================================
    # HEADER + FOOTER
    # ========================================================

    def draw_header_footer(
        canvas,
        doc,
    ):

        canvas.saveState()

        width, height = A4

        # Top blue accent
        canvas.setFillColor(
            colors.HexColor(
                "#2563EB"
            )
        )

        canvas.rect(
            0,
            height - 4,
            width,
            4,
            fill=1,
            stroke=0,
        )

        # Header
        canvas.setFont(
            "Helvetica-Bold",
            8,
        )

        canvas.setFillColor(
            colors.HexColor(
                "#64748B"
            )
        )

        canvas.drawString(
            20 * mm,
            height - 13 * mm,
            "ORION AI",
        )

        canvas.setFont(
            "Helvetica",
            8,
        )

        canvas.drawRightString(
            width - 20 * mm,
            height - 13 * mm,
            "Executive Intelligence Report",
        )

        # Footer line
        canvas.setStrokeColor(
            colors.HexColor(
                "#E2E8F0"
            )
        )

        canvas.line(
            20 * mm,
            12 * mm,
            width - 20 * mm,
            12 * mm,
        )

        # Footer
        canvas.setFont(
            "Helvetica",
            7,
        )

        canvas.setFillColor(
            colors.HexColor(
                "#94A3B8"
            )
        )

        canvas.drawString(
            20 * mm,
            7 * mm,
            "Confidential • OrionAI Enterprise Platform",
        )

        canvas.drawRightString(
            width - 20 * mm,
            7 * mm,
            f"Page {doc.page}",
        )

        canvas.restoreState()

    # ========================================================
    # BUILD PDF
    # ========================================================

    try:

        document.build(
            story,
            onFirstPage=draw_header_footer,
            onLaterPages=draw_header_footer,
        )

    except Exception as e:

        logger.error(
            "ReportLab failed while building PDF: %s",
            str(e),
            exc_info=True,
        )

        raise RuntimeError(
            f"PDF build failed: {str(e)}"
        ) from e

    # ========================================================
    # VERIFY FILE
    # ========================================================

    if not os.path.isfile(
        file_path
    ):

        raise RuntimeError(
            "PDF generation completed but "
            "the PDF file was not created."
        )

    if os.path.getsize(
        file_path
    ) == 0:

        raise RuntimeError(
            "PDF was created but is empty."
        )

    # ========================================================
    # SAVE PATH
    # ========================================================

    report.file_path = file_path

    db.session.commit()

    logger.info(
        "PDF generated successfully | report=%s | path=%s | size=%d",
        report.id,
        file_path,
        os.path.getsize(file_path),
    )

    return file_path


# ============================================================
# REPORT COLLECTION
# ============================================================

@blp.route("")
class ReportCollection(MethodView):

    @jwt_required()
    @blp.response(200)
    def get(self):

        user_uuid = (
            get_current_user_uuid()
        )

        try:

            reports = (
                Report.query
                .join(
                    Project,
                    Report.project_id == Project.id,
                )
                .filter(
                    Project.owner_id == user_uuid,
                )
                .order_by(
                    Report.created_at.desc()
                )
                .all()
            )

            return [
                serialize_report(report)
                for report in reports
            ]

        except Exception as e:

            logger.error(
                "Failed to load reports: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to load reports.",
            )


# ============================================================
# SINGLE REPORT
# ============================================================

@blp.route("/<report_id>")
class ReportResource(MethodView):

    # ========================================================
    # GET
    # ========================================================

    @jwt_required()
    @blp.response(200)
    def get(
        self,
        report_id,
    ):

        user_uuid = (
            get_current_user_uuid()
        )

        report = get_owned_report(
            report_id,
            user_uuid,
        )

        return serialize_report(
            report
        )

    # ========================================================
    # DELETE
    # ========================================================

    @jwt_required()
    def delete(
        self,
        report_id,
    ):

        user_uuid = (
            get_current_user_uuid()
        )

        report = get_owned_report(
            report_id,
            user_uuid,
        )

        file_path = report.file_path

        try:

            db.session.delete(
                report
            )

            db.session.commit()

            if file_path:

                try:

                    if os.path.isfile(
                        file_path
                    ):

                        os.remove(
                            file_path
                        )

                except Exception as file_error:

                    logger.warning(
                        "Could not delete report file: %s",
                        str(file_error),
                    )

            logger.info(
                "Report deleted: %s",
                report_id,
            )

            return "", 204

        except Exception as e:

            db.session.rollback()

            logger.error(
                "Failed to delete report: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message="Failed to delete report.",
            )


# ============================================================
# DOWNLOAD REPORT
# ============================================================

@blp.route(
    "/<report_id>/download"
)
class ReportDownloadResource(MethodView):

    @jwt_required()
    def get(
        self,
        report_id,
    ):

        user_uuid = (
            get_current_user_uuid()
        )

        report = get_owned_report(
            report_id,
            user_uuid,
        )

        # ====================================================
        # CHECK EXISTING PDF
        # ====================================================

        file_path = report.file_path

        if file_path:

            file_path = os.path.abspath(
                file_path
            )

            if not os.path.isfile(
                file_path
            ):

                logger.warning(
                    "Stored PDF does not exist. "
                    "Regenerating report=%s",
                    report.id,
                )

                file_path = None

        # ====================================================
        # GENERATE PDF
        # ====================================================

        if not file_path:

            if not report.content_markdown:

                abort(
                    404,
                    message=(
                        "Report has no downloadable content."
                    ),
                )

            try:

                file_path = (
                    generate_report_pdf(
                        report
                    )
                )

            except Exception as e:

                db.session.rollback()

                logger.error(
                    "PDF generation failed | report=%s | error=%s",
                    report.id,
                    str(e),
                    exc_info=True,
                )

                # IMPORTANT:
                # Do not call abort() inside generate_report_pdf().
                # Return the actual error message here.

                abort(
                    500,
                    message=(
                        f"Failed to generate report PDF: {str(e)}"
                    ),
                )

        # ====================================================
        # VERIFY FILE
        # ====================================================

        if not os.path.isfile(
            file_path
        ):

            abort(
                500,
                message=(
                    "Report PDF was generated "
                    "but the file could not be found."
                ),
            )

        # ====================================================
        # DOWNLOAD
        # ====================================================

        filename = (
            f"{make_safe_filename(report.title)}.pdf"
        )

        logger.info(
            "Sending report PDF | report=%s | file=%s",
            report.id,
            file_path,
        )

        try:

            return send_file(
                file_path,
                mimetype="application/pdf",
                as_attachment=True,
                download_name=filename,
            )

        except Exception as e:

            logger.error(
                "Failed to send report PDF: %s",
                str(e),
                exc_info=True,
            )

            abort(
                500,
                message=(
                    f"Failed to download report: {str(e)}"
                ),
            )