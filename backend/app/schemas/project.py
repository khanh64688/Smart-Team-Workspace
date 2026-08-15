import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.project import ProjectStatus, ProjectVisibility
from app.models.project_member import ProjectRole


class ProjectCreate(BaseModel):
    name: str = Field(min_length=3, max_length=100)
    description: str | None = Field(default=None, max_length=5000)
    visibility: ProjectVisibility = ProjectVisibility.PRIVATE


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=100)
    description: str | None = Field(default=None, max_length=5000)
    visibility: ProjectVisibility | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    description: str | None
    status: ProjectStatus
    visibility: ProjectVisibility
    owner_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ProjectPage(BaseModel):
    data: list[ProjectOut]
    meta: dict[str, int]


class MemberCreate(BaseModel):
    user_id: uuid.UUID
    project_role: ProjectRole = ProjectRole.MEMBER
    can_config: bool = False


class MemberRoleUpdate(BaseModel):
    project_role: ProjectRole


class MemberConfigUpdate(BaseModel):
    """Dùng cho PATCH /{project_id}/members/{user_id}/config"""
    can_config: bool


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: uuid.UUID
    full_name: str
    email: str
    project_role: ProjectRole
    can_config: bool
    joined_at: datetime
