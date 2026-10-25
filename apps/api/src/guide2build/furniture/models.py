"""Furniture-specific contracts; no LEGO units, connector or accuracy assumptions."""
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Dimensions(StrictModel):
    width: float = Field(gt=0)
    depth: float = Field(gt=0)
    height: float = Field(gt=0)


class Document(StrictModel):
    id: str = Field(pattern=r"^AA-[0-9]+-[0-9]+$")
    title: str
    url: str
    page_count: int = Field(ge=1, le=12)
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    role: Literal["primary", "legacy", "care"]
    notice: str


class Finish(StrictModel):
    id: str
    name: str
    base_color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    wood_effect: bool


class Product(StrictModel):
    family_id: str
    finish: Finish
    article_number: str = Field(pattern=r"^[0-9]{8}$")
    display_article_number: str
    name: str
    variant: str
    dimensions_mm: Dimensions
    product_url: str
    documents: list[Document] = Field(min_length=1)

    @model_validator(mode="after")
    def document_identity(self):
        if len({d.id for d in self.documents}) != len(self.documents):
            raise ValueError("Duplicate document IDs")
        if sum(d.role == "primary" for d in self.documents) != 1:
            raise ValueError("Exactly one primary assembly document required")
        return self


class Component(StrictModel):
    id: str
    name: str
    quantity: int = Field(gt=0)
    hardware_id: str | None = None
    description: str


class Source(StrictModel):
    document_id: str | None = None
    page_index: int | None = Field(default=None, ge=0)
    product_url: str | None = None


class Help(StrictModel):
    question: str
    answer: str


class Step(StrictModel):
    id: str
    title: str
    instruction: str
    kind: Literal["prepare", "insert_screws", "attach_legs", "finish"]
    source: Source
    secondary_source: Source | None = None
    active_components: list[str]
    help: list[Help]
    warnings: list[str]


class AnimationSegment(StrictModel):
    start: float = Field(ge=0, le=1)
    end: float = Field(ge=0, le=1)

    @model_validator(mode="after")
    def ordered(self):
        if self.end <= self.start:
            raise ValueError("Animation segment must advance")
        return self


class CoachAction(StrictModel):
    id: str
    kind: Literal["prepare", "identify", "screw", "leg", "finish"]
    title: str
    instruction: str
    component_instances: list[str]
    animation: AnimationSegment | None = None
    source: Source
    confirmation_label: str
    help: list[Help] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    checks: list[str] = Field(default_factory=list)


class Review(StrictModel):
    agent_review: Literal["candidate", "source_checked"]
    human_review: Literal["not_run"] = "not_run"
    physical_build: Literal["not_run"] = "not_run"


class Tutorial(StrictModel):
    schema_version: Literal["1.0"] = "1.0"
    product: Product
    revision: str
    source_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    artifact_kind: Literal["pdf_assisted_authoring"]
    geometry_note: str
    source_sequence_note: str
    review: Review
    components: list[Component] = Field(min_length=1)
    warnings: list[str]
    steps: list[Step] = Field(min_length=1)
    coach_actions: list[CoachAction] = Field(default_factory=list)

    @model_validator(mode="after")
    def traceable(self):
        documents = {d.id: d for d in self.product.documents}
        primary = next(d for d in documents.values() if d.role == "primary")
        if self.source_sha256 != primary.sha256:
            raise ValueError("Tutorial must match primary document bytes")
        component_ids = {c.id for c in self.components}
        if len(component_ids) != len(self.components):
            raise ValueError("Duplicate components")
        if len({s.id for s in self.steps}) != len(self.steps):
            raise ValueError("Duplicate steps")
        def validate_source(reference: Source):
            if reference.product_url and reference.product_url != self.product.product_url:
                raise ValueError("Unknown product provenance")
            if reference.document_id is None:
                if reference.page_index is not None or reference.product_url != self.product.product_url:
                    raise ValueError("Product-only source requires exact product URL")
            else:
                document = documents.get(reference.document_id)
                if document is None or reference.page_index is None or reference.page_index >= document.page_count:
                    raise ValueError("Unavailable source page")
        for step in self.steps:
            validate_source(step.source)
            if step.secondary_source:
                validate_source(step.secondary_source)
            if not set(step.active_components) <= component_ids:
                raise ValueError("Step refers to unknown components")
        instances = {"tabletop", *(f"screw-{i}" for i in range(1, 5)), *(f"leg-{i}" for i in range(1, 5))}
        if len({a.id for a in self.coach_actions}) != len(self.coach_actions):
            raise ValueError("Duplicate coach action IDs")
        for action in self.coach_actions:
            validate_source(action.source)
            if not set(action.component_instances) <= instances:
                raise ValueError("Unknown coach component instance")
            if (action.kind in {"screw", "leg"}) != (action.animation is not None):
                raise ValueError("Only physical connection actions have animation segments")
        return self
