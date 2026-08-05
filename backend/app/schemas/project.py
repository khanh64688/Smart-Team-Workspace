import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.project import ProjectStatus
from app.models.project_member import ProjectRole


class ProjectCreate(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    description: str | None = Field(default=None, max_length=5000)


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=100)
    description: str | None = Field(default=None, max_length=5000)


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    description: str | None
    status: ProjectStatus
    owner_id: str
    created_at: datetime
    updated_at: datetime

    @field_validator("owner_id", mode="before")
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v


class ProjectPage(BaseModel):
    data: list[ProjectOut]
    meta: dict[str, int]


class MemberCreate(BaseModel):
    user_id: str
    project_role: ProjectRole = ProjectRole.MEMBER


class MemberRoleUpdate(BaseModel):
    project_role: ProjectRole


class MemberOut(BaseModel):
    user_id: str
    full_name: str
    email: str
    project_role: ProjectRole
    joined_at: datetime

    @field_validator("user_id", mode="before")
    @classmethod
    def convert_uuid_to_str(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v
