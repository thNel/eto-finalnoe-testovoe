from pydantic import BaseModel, Field


class Resource(BaseModel):
    id: int
    name: str


class StatefulResource(Resource):
    state: str


class Domain(StatefulResource):
    is_ssl: bool = False


class Campaign(Resource):
    alias: str
    type: str
    state: str
    domain: str | None = None
    domain_id: int | None = None
    group_id: int | None = None
    traffic_source_id: int | None = None


class StreamFilter(BaseModel):
    name: str
    mode: str
    payload: list[str]


class StreamOffer(BaseModel):
    offer_id: int
    share: int
    state: str


class Stream(BaseModel):
    id: int
    name: str = ""
    campaign_id: int
    type: str
    state: str
    position: int
    weight: float | None = None
    schema_type: str = Field(validation_alias="schema")
    action_type: str | None = None
    action_payload: str | dict | None = None
    action_options: dict | list | None = None
    collect_clicks: bool | None = None
    filter_or: bool | None = None
    filters: list[StreamFilter] = Field(default_factory=list)
    landings: list[dict] = Field(default_factory=list)
    offers: list[StreamOffer] = Field(default_factory=list)


class ClickRow(BaseModel):
    stream_id: int | None
    clicks: int


class ClickReport(BaseModel):
    rows: list[ClickRow]
