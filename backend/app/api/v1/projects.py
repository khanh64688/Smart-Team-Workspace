from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.project import ProjectStatus
from app.models.user import SystemRole, User
from app.repositories.project import ProjectRepository
from app.schemas.project import MemberCreate, MemberOut, MemberRoleUpdate, ProjectCreate, ProjectOut, ProjectPage, ProjectUpdate
from app.services.project import ProjectService

router = APIRouter(prefix="/projects", tags=["projects"])

def service(db: Session = Depends(get_db)): return ProjectService(db)

@router.post("", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)): return svc.create(payload, actor)

@router.get("", response_model=ProjectPage)
def list_projects(q: str | None = None, project_status: ProjectStatus | None = Query(None, alias="status"), page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100), sort: str = "-created_at", actor: User = Depends(get_current_user), db: Session = Depends(get_db)):
    data, total = ProjectRepository(db).list(actor.id, actor.role == SystemRole.ADMIN, q, project_status, page, size, sort)
    return {"data": data, "meta": {"page": page, "size": size, "total": total}}

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)):
    project = svc.require_project(project_id); svc.require_member(project_id, actor); return project

@router.put("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, payload: ProjectUpdate, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)): return svc.update(project_id, payload, actor)

@router.patch("/{project_id}/close", response_model=ProjectOut)
def close_project(project_id: str, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)): return svc.close(project_id, actor)

@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)): svc.soft_delete(project_id, actor); return Response(status_code=204)

def member_out(member):
    return MemberOut(user_id=member.user_id, full_name=member.user.full_name, email=member.user.email, project_role=member.project_role, joined_at=member.joined_at)

@router.get("/{project_id}/members", response_model=list[MemberOut])
def list_members(project_id: str, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)):
    svc.require_member(project_id, actor); return [member_out(m) for m in svc.repo.members(project_id)]

@router.post("/{project_id}/members", response_model=MemberOut, status_code=201)
def add_member(project_id: str, payload: MemberCreate, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)):
    member = svc.add_member(project_id, payload, actor); member.user = svc.db.get(User, member.user_id); return member_out(member)

@router.patch("/{project_id}/members/{user_id}", response_model=MemberOut)
def change_member_role(project_id: str, user_id: str, payload: MemberRoleUpdate, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)):
    member = svc.change_role(project_id, user_id, payload.project_role, actor); member.user = svc.db.get(User, user_id); return member_out(member)

@router.delete("/{project_id}/members/me", status_code=204)
def leave_project(project_id: str, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)): svc.remove_member(project_id, actor.id, actor, leaving=True); return Response(status_code=204)

@router.delete("/{project_id}/members/{user_id}", status_code=204)
def remove_member(project_id: str, user_id: str, actor: User = Depends(get_current_user), svc: ProjectService = Depends(service)): svc.remove_member(project_id, user_id, actor); return Response(status_code=204)
