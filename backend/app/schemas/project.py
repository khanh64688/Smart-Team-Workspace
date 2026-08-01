from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

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
