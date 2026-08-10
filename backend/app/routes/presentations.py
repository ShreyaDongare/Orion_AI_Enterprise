import io
import os
import re
from uuid import UUID

from flask import send_file, request
from flask.views import MethodView
from flask_smorest import Blueprint, abort

from pptx import Presentation as PptxPresentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt

from app.extensions import db
from app.models.output import Presentation


blp = Blueprint(
    "presentations",
    "presentations",
    url_prefix="/api/v1/presentations",
    description="Presentation operations",
)


# ============================================================
# ORIONAI COLORS
# ============================================================

NAVY = "0B1220"
BLUE = "2563EB"
CYAN = "06B6D4"
LIGHT_BLUE = "EFF6FF"
PALE_BLUE = "F8FAFC"
WHITE = "FFFFFF"
SLATE = "475569"
DARK = "0F172A"
BORDER = "E2E8F0"
GREEN = "10B981"
PURPLE = "7C3AED"
AMBER = "F59E0B"


# ============================================================
# COLOR HELPER
# ============================================================

def rgb(hex_color):
    return RGBColor.from_string(
        hex_color.replace("#", "")
    )


# ============================================================
# SERIALIZER
# ============================================================

def serialize_presentation(presentation):

    return {
        "id": str(presentation.id),
        "project_id": str(presentation.project_id),
        "title": (
            presentation.title
            or "Untitled Presentation"
        ),
        "slides_data": (
            presentation.slides_data
            or {"slides": []}
        ),
        "file_path": presentation.file_path,
        "created_by": (
            str(presentation.created_by)
            if presentation.created_by
            else None
        ),
        "created_at": (
            presentation.created_at.isoformat()
            if presentation.created_at
            else None
        ),
    }


# ============================================================
# SLIDE DATA
# ============================================================

def get_slides(presentation):

    data = presentation.slides_data or {}

    if isinstance(data, list):
        return data

    if isinstance(data, dict):

        slides = data.get(
            "slides",
            []
        )

        if isinstance(slides, list):
            return slides

    return []


def clean_text(value):

    if value is None:
        return ""

    return str(value).strip()


def clean_bullet(value):

    text = clean_text(value)

    text = re.sub(
        r"^[-*•]\s*",
        "",
        text
    )

    text = re.sub(
        r"^\d+[.)]\s*",
        "",
        text
    )

    return text.strip()


# ============================================================
# SHAPE HELPERS
# ============================================================

def add_rectangle(
    slide,
    left,
    top,
    width,
    height,
    fill=WHITE,
    line=BORDER,
    rounded=True,
):

    shape_type = (
        MSO_SHAPE.ROUNDED_RECTANGLE
        if rounded
        else MSO_SHAPE.RECTANGLE
    )

    shape = slide.shapes.add_shape(
        shape_type,
        Inches(left),
        Inches(top),
        Inches(width),
        Inches(height)
    )

    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(fill)

    shape.line.color.rgb = rgb(line)

    return shape


def add_circle(
    slide,
    left,
    top,
    size,
    fill,
    text=None,
):

    shape = slide.shapes.add_shape(
        MSO_SHAPE.OVAL,
        Inches(left),
        Inches(top),
        Inches(size),
        Inches(size)
    )

    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(fill)

    shape.line.fill.background()

    if text:

        tf = shape.text_frame

        tf.clear()

        tf.vertical_anchor = (
            MSO_ANCHOR.MIDDLE
        )

        paragraph = tf.paragraphs[0]

        paragraph.alignment = (
            PP_ALIGN.CENTER
        )

        run = paragraph.add_run()

        run.text = text
        run.font.name = "Aptos"
        run.font.size = Pt(9)
        run.font.bold = True
        run.font.color.rgb = rgb(WHITE)

    return shape


def add_line(
    slide,
    x1,
    y1,
    x2,
    y2,
    color=BORDER,
    width=1.5,
):

    line = slide.shapes.add_connector(
        MSO_CONNECTOR.STRAIGHT,
        Inches(x1),
        Inches(y1),
        Inches(x2),
        Inches(y2)
    )

    line.line.color.rgb = rgb(color)
    line.line.width = Pt(width)

    return line


# ============================================================
# TEXT HELPER
# ============================================================

def add_text(
    slide,
    text,
    left,
    top,
    width,
    height,
    font_size=18,
    color=DARK,
    bold=False,
    align="left",
):

    box = slide.shapes.add_textbox(
        Inches(left),
        Inches(top),
        Inches(width),
        Inches(height)
    )

    tf = box.text_frame

    tf.clear()
    tf.word_wrap = True

    paragraph = tf.paragraphs[0]

    if align == "center":
        paragraph.alignment = (
            PP_ALIGN.CENTER
        )

    elif align == "right":
        paragraph.alignment = (
            PP_ALIGN.RIGHT
        )

    else:
        paragraph.alignment = (
            PP_ALIGN.LEFT
        )

    run = paragraph.add_run()

    run.text = clean_text(text)

    run.font.name = "Aptos"
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.color.rgb = rgb(color)

    return box


# ============================================================
# BULLET LIST
# ============================================================

def add_bullets(
    slide,
    bullets,
    left,
    top,
    width,
    height,
    font_size=15,
):

    box = slide.shapes.add_textbox(
        Inches(left),
        Inches(top),
        Inches(width),
        Inches(height)
    )

    tf = box.text_frame

    tf.clear()
    tf.word_wrap = True
    tf.vertical_anchor = (
        MSO_ANCHOR.TOP
    )

    first = True

    for bullet in bullets:

        bullet = clean_bullet(
            bullet
        )

        if not bullet:
            continue

        paragraph = (
            tf.paragraphs[0]
            if first
            else tf.add_paragraph()
        )

        first = False

        paragraph.alignment = (
            PP_ALIGN.LEFT
        )

        paragraph.space_after = Pt(10)

        run = paragraph.add_run()

        run.text = f"•  {bullet}"

        run.font.name = "Aptos"
        run.font.size = Pt(font_size)
        run.font.color.rgb = rgb(SLATE)

    return box


# ============================================================
# HEADER
# ============================================================

def add_header(
    slide,
    title,
    slide_number,
    total_slides,
):

    add_rectangle(
        slide,
        0,
        0,
        13.333,
        0.07,
        fill=BLUE,
        line=BLUE,
        rounded=False,
    )

    add_circle(
        slide,
        0.55,
        0.30,
        0.38,
        BLUE,
        "✦",
    )

    add_text(
        slide,
        "Orion AI",
        1.02,
        0.31,
        1.5,
        0.3,
        font_size=13,
        color=NAVY,
        bold=True,
    )

    add_text(
        slide,
        title,
        0.55,
        1.00,
        11.8,
        0.65,
        font_size=27,
        color=NAVY,
        bold=True,
    )

    add_text(
        slide,
        "ORIONAI • ENTERPRISE AI PLATFORM",
        0.55,
        7.12,
        4.5,
        0.22,
        font_size=8,
        color=SLATE,
        bold=True,
    )

    add_text(
        slide,
        f"{slide_number} / {total_slides}",
        11.7,
        7.12,
        1.0,
        0.22,
        font_size=8,
        color=SLATE,
        bold=True,
        align="right",
    )


# ============================================================
# COVER
# ============================================================

def create_cover(
    prs,
    slide_data,
    total_slides,
):

    slide = prs.slides.add_slide(
        prs.slide_layouts[6]
    )

    add_rectangle(
        slide,
        0,
        0,
        13.333,
        7.5,
        fill=NAVY,
        line=NAVY,
        rounded=False,
    )

    # Decorative blocks
    add_rectangle(
        slide,
        10.2,
        0,
        3.13,
        7.5,
        fill=BLUE,
        line=BLUE,
        rounded=False,
    )

    add_rectangle(
        slide,
        11.0,
        0,
        2.33,
        7.5,
        fill=CYAN,
        line=CYAN,
        rounded=False,
    )

    add_circle(
        slide,
        0.7,
        0.7,
        0.65,
        BLUE,
        "✦",
    )

    add_text(
        slide,
        "ORION AI",
        1.55,
        0.72,
        2.5,
        0.35,
        font_size=17,
        color=WHITE,
        bold=True,
    )

    add_text(
        slide,
        "ENTERPRISE AI PLATFORM",
        1.55,
        1.10,
        3.0,
        0.25,
        font_size=8,
        color="CBD5E1",
        bold=True,
    )

    title = clean_text(
        slide_data.get(
            "title",
            "Executive AI Presentation"
        )
    )

    subtitle = clean_text(
        slide_data.get(
            "subtitle",
            ""
        )
    )

    add_text(
        slide,
        title,
        0.75,
        2.15,
        8.4,
        1.4,
        font_size=34,
        color=WHITE,
        bold=True,
    )

    add_text(
        slide,
        subtitle,
        0.78,
        3.65,
        7.8,
        0.8,
        font_size=17,
        color="BFDBFE",
    )

    add_rectangle(
        slide,
        0.75,
        5.35,
        7.8,
        0.95,
        fill="172033",
        line="334155",
        rounded=True,
    )

    add_text(
        slide,
        "EXECUTIVE BRIEFING",
        1.05,
        5.62,
        2.2,
        0.25,
        font_size=9,
        color=CYAN,
        bold=True,
    )

    add_text(
        slide,
        "AI-generated strategic presentation",
        3.0,
        5.57,
        4.9,
        0.3,
        font_size=11,
        color=WHITE,
    )

    add_text(
        slide,
        f"01 / {total_slides}",
        11.15,
        6.7,
        1.3,
        0.3,
        font_size=9,
        color=WHITE,
        bold=True,
        align="right",
    )

    return slide


# ============================================================
# GENERAL SLIDE
# ============================================================

def create_general_slide(
    prs,
    slide_data,
    number,
    total,
):

    slide = prs.slides.add_slide(
        prs.slide_layouts[6]
    )

    title = clean_text(
        slide_data.get(
            "title",
            "OrionAI"
        )
    )

    subtitle = clean_text(
        slide_data.get(
            "subtitle",
            ""
        )
    )

    add_header(
        slide,
        title,
        number,
        total,
    )

    if subtitle:

        add_text(
            slide,
            subtitle,
            0.58,
            1.72,
            11.7,
            0.4,
            font_size=13,
            color=BLUE,
            bold=True,
        )

    bullets = [
        clean_bullet(b)
        for b in (
            slide_data.get(
                "bullets",
                []
            )
            or []
        )
    ]

    bullets = [
        b for b in bullets if b
    ]

    add_rectangle(
        slide,
        0.70,
        2.45,
        7.55,
        3.75,
        fill=WHITE,
        line=BORDER,
        rounded=True,
    )

    if bullets:

        add_bullets(
            slide,
            bullets,
            1.0,
            2.85,
            6.9,
            3.0,
            font_size=14,
        )

    else:

        content = clean_text(
            slide_data.get(
                "content",
                "No additional content."
            )
        )

        add_text(
            slide,
            content,
            1.0,
            2.85,
            6.9,
            2.9,
            font_size=14,
            color=SLATE,
        )

    # Insight card
    add_rectangle(
        slide,
        8.65,
        2.45,
        3.85,
        3.75,
        fill=NAVY,
        line=NAVY,
        rounded=True,
    )

    add_text(
        slide,
        "ORIONAI",
        9.05,
        2.90,
        2.8,
        0.3,
        font_size=10,
        color=CYAN,
        bold=True,
    )

    add_text(
        slide,
        "Enterprise AI",
        9.05,
        3.40,
        2.8,
        0.5,
        font_size=22,
        color=WHITE,
        bold=True,
    )

    add_text(
        slide,
        "Secure • Intelligent • Scalable",
        9.05,
        4.05,
        2.8,
        0.35,
        font_size=10,
        color="CBD5E1",
        bold=True,
    )

    add_text(
        slide,
        "AI-powered workflows designed for enterprise decision-making.",
        9.05,
        4.75,
        2.8,
        0.85,
        font_size=10,
        color="E2E8F0",
    )

    return slide


# ============================================================
# ARCHITECTURE SLIDE
# ============================================================

def create_architecture_slide(
    prs,
    slide_data,
    number,
    total,
):

    slide = prs.slides.add_slide(
        prs.slide_layouts[6]
    )

    add_header(
        slide,
        clean_text(
            slide_data.get(
                "title",
                "Multi-Agent Architecture"
            )
        ),
        number,
        total,
    )

    add_text(
        slide,
        clean_text(
            slide_data.get(
                "subtitle",
                "Specialized AI agents coordinated through OrionAI"
            )
        ),
        0.58,
        1.72,
        11.7,
        0.4,
        font_size=13,
        color=BLUE,
        bold=True,
    )

    # Central orchestrator
    add_rectangle(
        slide,
        4.65,
        2.40,
        4.05,
        0.78,
        fill=BLUE,
        line=BLUE,
        rounded=True,
    )

    add_text(
        slide,
        "ORIONAI ORCHESTRATOR",
        4.85,
        2.65,
        3.65,
        0.25,
        font_size=13,
        color=WHITE,
        bold=True,
        align="center",
    )

    agents = [
        ("Research Agent", PURPLE),
        ("Report Agent", BLUE),
        ("Data Agent", CYAN),
        ("Executive Agent", GREEN),
    ]

    positions = [
        (0.65, 4.05),
        (3.55, 4.05),
        (6.45, 4.05),
        (9.35, 4.05),
    ]

    for (
        (agent_name, color),
        (x, y),
    ) in zip(
        agents,
        positions
    ):

        add_rectangle(
            slide,
            x,
            y,
            2.35,
            1.0,
            fill=WHITE,
            line=color,
            rounded=True,
        )

        add_circle(
            slide,
            x + 0.15,
            y + 0.22,
            0.45,
            color,
            "AI",
        )

        add_text(
            slide,
            agent_name,
            x + 0.72,
            y + 0.28,
            1.45,
            0.25,
            font_size=9,
            color=NAVY,
            bold=True,
        )

        add_line(
            slide,
            6.67,
            3.18,
            x + 1.17,
            4.05,
            color="CBD5E1",
            width=1.5,
        )

    add_rectangle(
        slide,
        0.75,
        5.65,
        11.75,
        0.75,
        fill=LIGHT_BLUE,
        line="BFDBFE",
        rounded=True,
    )

    add_text(
        slide,
        "KEY ADVANTAGES",
        1.05,
        5.90,
        1.5,
        0.2,
        font_size=8,
        color=BLUE,
        bold=True,
    )

    add_text(
        slide,
        "Specialization • Parallel execution • Reliability • Scalable workflows",
        2.75,
        5.85,
        8.9,
        0.3,
        font_size=11,
        color=NAVY,
        bold=True,
    )

    return slide


# ============================================================
# RAG SLIDE
# ============================================================

def create_rag_slide(
    prs,
    slide_data,
    number,
    total,
):

    slide = prs.slides.add_slide(
        prs.slide_layouts[6]
    )

    add_header(
        slide,
        clean_text(
            slide_data.get(
                "title",
                "RAG & Knowledge Base"
            )
        ),
        number,
        total,
    )

    add_text(
        slide,
        clean_text(
            slide_data.get(
                "subtitle",
                "Grounding AI responses in trusted enterprise information"
            )
        ),
        0.58,
        1.72,
        11.7,
        0.4,
        font_size=13,
        color=BLUE,
        bold=True,
    )

    steps = [
        ("01", "Documents", BLUE),
        ("02", "Chunking", PURPLE),
        ("03", "Embeddings", CYAN),
        ("04", "Vector DB", GREEN),
        ("05", "Retriever", AMBER),
        ("06", "LLM", BLUE),
    ]

    x = 0.45

    for index, (
        num,
        label,
        color,
    ) in enumerate(steps):

        add_rectangle(
            slide,
            x,
            3.0,
            1.9,
            1.45,
            fill=WHITE,
            line=color,
            rounded=True,
        )

        add_circle(
            slide,
            x + 0.65,
            3.18,
            0.42,
            color,
            num,
        )

        add_text(
            slide,
            label,
            x + 0.15,
            3.82,
            1.6,
            0.3,
            font_size=10,
            color=NAVY,
            bold=True,
            align="center",
        )

        if index < len(steps) - 1:

            add_line(
                slide,
                x + 1.9,
                3.72,
                x + 2.12,
                3.72,
                color="94A3B8",
                width=2,
            )

        x += 2.12

    add_rectangle(
        slide,
        0.75,
        5.25,
        11.75,
        1.0,
        fill=PALE_BLUE,
        line=BORDER,
        rounded=True,
    )

    add_text(
        slide,
        "WHY RAG?",
        1.0,
        5.52,
        1.2,
        0.25,
        font_size=9,
        color=BLUE,
        bold=True,
    )

    add_text(
        slide,
        "Relevant enterprise context improves factual consistency and reduces unsupported AI responses.",
        2.3,
        5.47,
        9.5,
        0.45,
        font_size=11,
        color=NAVY,
        bold=True,
    )

    return slide


# ============================================================
# BENEFITS SLIDE
# ============================================================

def create_benefits_slide(
    prs,
    slide_data,
    number,
    total,
):

    slide = prs.slides.add_slide(
        prs.slide_layouts[6]
    )

    add_header(
        slide,
        clean_text(
            slide_data.get(
                "title",
                "Enterprise Benefits"
            )
        ),
        number,
        total,
    )

    add_text(
        slide,
        clean_text(
            slide_data.get(
                "subtitle",
                "Enterprise-grade AI capabilities"
            )
        ),
        0.58,
        1.72,
        11.7,
        0.4,
        font_size=13,
        color=BLUE,
        bold=True,
    )

    bullets = [
        clean_bullet(b)
        for b in (
            slide_data.get(
                "bullets",
                []
            )
            or []
        )
    ]

    bullets = [
        b for b in bullets if b
    ]

    colors = [
        BLUE,
        GREEN,
        PURPLE,
        CYAN,
    ]

    for index, bullet in enumerate(
        bullets[:4]
    ):

        row = index // 2
        col = index % 2

        x = (
            0.75
            if col == 0
            else 6.75
        )

        y = 2.45 + (
            row * 1.55
        )

        color = colors[
            index % len(colors)
        ]

        add_rectangle(
            slide,
            x,
            y,
            5.75,
            1.18,
            fill=WHITE,
            line=BORDER,
            rounded=True,
        )

        add_circle(
            slide,
            x + 0.20,
            y + 0.30,
            0.52,
            color,
            str(index + 1),
        )

        add_text(
            slide,
            bullet,
            x + 0.95,
            y + 0.27,
            4.45,
            0.62,
            font_size=10,
            color=NAVY,
            bold=True,
        )

    return slide


# ============================================================
# ROADMAP
# ============================================================

def create_roadmap_slide(
    prs,
    slide_data,
    number,
    total,
):

    slide = prs.slides.add_slide(
        prs.slide_layouts[6]
    )

    add_header(
        slide,
        clean_text(
            slide_data.get(
                "title",
                "Recommendations & Next Steps"
            )
        ),
        number,
        total,
    )

    add_text(
        slide,
        clean_text(
            slide_data.get(
                "subtitle",
                "A practical path toward enterprise adoption"
            )
        ),
        0.58,
        1.72,
        11.7,
        0.4,
        font_size=13,
        color=BLUE,
        bold=True,
    )

    bullets = [
        clean_bullet(b)
        for b in (
            slide_data.get(
                "bullets",
                []
            )
            or []
        )
    ]

    bullets = [
        b for b in bullets if b
    ]

    colors = [
        BLUE,
        PURPLE,
        GREEN,
    ]

    phases = [
        "DISCOVER",
        "PILOT",
        "SCALE",
    ]

    add_line(
        slide,
        1.4,
        3.35,
        11.8,
        3.35,
        color="CBD5E1",
        width=3,
    )

    for index in range(3):

        x = 1.15 + (
            index * 4.15
        )

        color = colors[index]

        add_circle(
            slide,
            x,
            3.0,
            0.7,
            color,
            str(index + 1),
        )

        add_text(
            slide,
            phases[index],
            x - 0.25,
            3.88,
            1.2,
            0.25,
            font_size=9,
            color=color,
            bold=True,
            align="center",
        )

        if index < len(bullets):

            add_rectangle(
                slide,
                x - 0.75,
                4.35,
                2.25,
                1.15,
                fill=WHITE,
                line=BORDER,
                rounded=True,
            )

            add_text(
                slide,
                bullets[index],
                x - 0.55,
                4.58,
                1.85,
                0.7,
                font_size=9,
                color=SLATE,
                bold=True,
                align="center",
            )

    return slide


# ============================================================
# PPTX GENERATOR
# ============================================================

def generate_pptx(
    presentation
):

    prs = PptxPresentation()

    # Widescreen 16:9
    prs.slide_width = Inches(
        13.333
    )

    prs.slide_height = Inches(
        7.5
    )

    slides = get_slides(
        presentation
    )

    if not slides:

        slides = [
            {
                "title": (
                    presentation.title
                    or "OrionAI Presentation"
                ),
                "subtitle": "Generated by OrionAI",
                "bullets": [
                    "No slide content available."
                ],
            }
        ]

    total = len(slides)

    for index, data in enumerate(
        slides
    ):

        if not isinstance(
            data,
            dict
        ):
            data = {
                "title": str(data),
                "subtitle": "",
                "bullets": [],
            }

        number = index + 1

        title = clean_text(
            data.get(
                "title",
                ""
            )
        ).lower()

        if index == 0:

            create_cover(
                prs,
                data,
                total,
            )

        elif (
            "architecture" in title
            or "multi-agent" in title
            or "multi agent" in title
        ):

            create_architecture_slide(
                prs,
                data,
                number,
                total,
            )

        elif (
            "rag" in title
            or "knowledge" in title
        ):

            create_rag_slide(
                prs,
                data,
                number,
                total,
            )

        elif (
            "security" in title
            or "benefit" in title
            or "business value" in title
        ):

            create_benefits_slide(
                prs,
                data,
                number,
                total,
            )

        elif (
            "recommend" in title
            or "next step" in title
            or "roadmap" in title
            or "conclusion" in title
        ):

            create_roadmap_slide(
                prs,
                data,
                number,
                total,
            )

        else:

            create_general_slide(
                prs,
                data,
                number,
                total,
            )

    output = io.BytesIO()

    prs.save(output)

    output.seek(0)

    return output



# ============================================================
# GET PRESENTATIONS
# ============================================================

@blp.route("")
class PresentationList(MethodView):

    @blp.response(200)
    def get(self):
        project_id = request.args.get("project_id")

        try:
            query = Presentation.query

            if project_id:
                try:
                    project_uuid = UUID(str(project_id))
                except (ValueError, TypeError):
                    abort(400, message="Invalid project_id.")

                query = query.filter(
                    Presentation.project_id == project_uuid
                )

            presentations = (
                query
                .order_by(Presentation.created_at.desc())
                .all()
            )

            return [
                serialize_presentation(p)
                for p in presentations
            ]

        except Exception as error:
            if getattr(error, "code", None):
                raise

            import traceback
            traceback.print_exc()
            abort(
                500,
                message=f"Failed to load presentations: {str(error)}",
            )


# ============================================================
# GET / DELETE PRESENTATION
# ============================================================

@blp.route("/<presentation_id>")
class PresentationDetail(MethodView):

    @blp.response(200)
    def get(self, presentation_id):
        try:
            presentation_uuid = UUID(str(presentation_id))
        except (ValueError, TypeError):
            abort(400, message="Invalid presentation ID.")

        presentation = (
            Presentation.query
            .filter(Presentation.id == presentation_uuid)
            .first()
        )

        if not presentation:
            abort(404, message="Presentation not found.")

        return serialize_presentation(presentation)

    def delete(self, presentation_id):
        try:
            presentation_uuid = UUID(str(presentation_id))
        except (ValueError, TypeError):
            abort(400, message="Invalid presentation ID.")

        presentation = (
            Presentation.query
            .filter(Presentation.id == presentation_uuid)
            .first()
        )

        if not presentation:
            abort(404, message="Presentation not found.")

        file_path = presentation.file_path

        try:
            db.session.delete(presentation)
            db.session.commit()

            # Also remove the generated PPTX from disk.
            if file_path:
                try:
                    candidate = str(file_path)

                    if not os.path.isabs(candidate):
                        backend_root = os.path.abspath(
                            os.path.join(
                                os.path.dirname(__file__),
                                "..",
                                "..",
                            )
                        )
                        candidate = os.path.abspath(
                            os.path.join(
                                backend_root,
                                candidate,
                            )
                        )

                    if os.path.isfile(candidate):
                        os.remove(candidate)

                except OSError:
                    import logging
                    logging.getLogger(__name__).warning(
                        "Could not remove PPTX file: %s",
                        file_path,
                        exc_info=True,
                    )

            return "", 204

        except Exception as error:
            db.session.rollback()

            import traceback
            traceback.print_exc()

            abort(
                500,
                message=f"Failed to delete presentation: {str(error)}",
            )


# ============================================================
# DOWNLOAD PPTX
# ============================================================

@blp.route("/<presentation_id>/download")
class PresentationDownload(MethodView):

    def get(self, presentation_id):
        try:
            presentation_uuid = UUID(str(presentation_id))
        except (ValueError, TypeError):
            abort(400, message="Invalid presentation ID.")

        presentation = (
            Presentation.query
            .filter(Presentation.id == presentation_uuid)
            .first()
        )

        if not presentation:
            abort(404, message="Presentation not found.")

        # --------------------------------------------------------
        # Safe download name
        # --------------------------------------------------------
        safe_title = re.sub(
            r"[^a-zA-Z0-9_-]+",
            "_",
            (presentation.title or "Presentation").strip(),
        ).strip("_")

        if not safe_title:
            safe_title = "Presentation"

        download_name = f"OrionAI_{safe_title}.pptx"

        # --------------------------------------------------------
        # Storage
        # --------------------------------------------------------
        # IMPORTANT:
        # Never resolve STORAGE_PATH relative to the current working
        # directory. Flask may be started from backend/, app/, or another
        # directory. Always resolve storage from the backend project root.
        #
        # presentations.py:
        #   backend/app/routes/presentations.py
        #
        # parents[2] => backend/
        backend_root = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                "..",
                "..",
            )
        )

        configured_storage = os.getenv(
            "STORAGE_PATH",
            "storage/files",
        )

        configured_storage = str(
            configured_storage
        ).strip()

        # If STORAGE_PATH is absolute, use it as-is.
        # If it is relative, resolve it from backend/.
        if os.path.isabs(configured_storage):
            storage_path = configured_storage
        else:
            # Remove leading "./" so values such as ./storage/files
            # cannot accidentally be resolved from backend/app/.
            configured_storage = configured_storage.replace(
                "/", os.sep
            ).replace(
                "\\", os.sep
            )

            configured_storage = configured_storage.lstrip(
                "\\/"
            )

            storage_path = os.path.abspath(
                os.path.join(
                    backend_root,
                    configured_storage,
                )
            )

        # Support an existing STORAGE_PATH that points to the old
        # "storage" directory while keeping the actual PPTX files in
        # storage/files/presentations.
        normalized_storage = os.path.normpath(
            storage_path
        )

        if os.path.basename(normalized_storage).lower() == "storage":
            storage_path = os.path.join(
                normalized_storage,
                "files",
            )

        presentation_dir = os.path.join(
            storage_path,
            "presentations",
        )

        try:
            os.makedirs(
                presentation_dir,
                exist_ok=True,
            )
        except OSError as error:
            abort(
                500,
                message=(
                    "Unable to create presentation storage: "
                    f"{str(error)}"
                ),
            )

        file_path = os.path.abspath(
            os.path.join(
                presentation_dir,
                f"presentation_{presentation.id}.pptx",
            )
        )

        print(
            "PRESENTATION STORAGE DIRECTORY:",
            presentation_dir,
        )
        print(
            "PRESENTATION FILE PATH:",
            file_path,
        )

        # --------------------------------------------------------
        # If file already exists, download it directly.
        # --------------------------------------------------------
        if os.path.isfile(file_path):
            try:
                presentation.file_path = file_path
                db.session.commit()

                return send_file(
                    file_path,
                    mimetype=(
                        "application/vnd.openxmlformats-"
                        "officedocument.presentationml.presentation"
                    ),
                    as_attachment=True,
                    download_name=download_name,
                    max_age=0,
                )
            except Exception as error:
                db.session.rollback()

                import logging
                logging.getLogger(__name__).warning(
                    "Existing PPTX could not be downloaded. "
                    "Regenerating it. Error: %s",
                    error,
                    exc_info=True,
                )

        # --------------------------------------------------------
        # Generate PPTX
        # --------------------------------------------------------
        try:
            output = generate_pptx(presentation)

            if output is None:
                raise RuntimeError(
                    "generate_pptx() returned None."
                )

            output.seek(0)
            pptx_bytes = output.read()

            if not pptx_bytes:
                raise RuntimeError(
                    "Generated PPTX is empty."
                )

        except Exception as error:
            import traceback
            traceback.print_exc()

            abort(
                500,
                message=(
                    "Failed to generate presentation: "
                    f"{str(error)}"
                ),
            )

        # --------------------------------------------------------
        # Save PPTX
        # --------------------------------------------------------
        try:
            with open(file_path, "wb") as file:
                file.write(pptx_bytes)

            if not os.path.isfile(file_path):
                raise RuntimeError(
                    "PPTX file was not created."
                )

            if os.path.getsize(file_path) == 0:
                raise RuntimeError(
                    "PPTX file is empty."
                )

            presentation.file_path = file_path
            db.session.commit()

        except Exception as error:
            db.session.rollback()

            try:
                if os.path.isfile(file_path):
                    os.remove(file_path)
            except OSError:
                pass

            import traceback
            traceback.print_exc()

            abort(
                500,
                message=(
                    "Failed to save presentation: "
                    f"{str(error)}"
                ),
            )

        # --------------------------------------------------------
        # Download
        # --------------------------------------------------------
        try:
            return send_file(
                file_path,
                mimetype=(
                    "application/vnd.openxmlformats-"
                    "officedocument.presentationml.presentation"
                ),
                as_attachment=True,
                download_name=download_name,
                max_age=0,
            )

        except Exception as error:
            import traceback
            traceback.print_exc()

            abort(
                500,
                message=(
                    "Failed to download presentation: "
                    f"{str(error)}"
                ),
            )