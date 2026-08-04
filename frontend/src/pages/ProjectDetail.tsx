import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import type { Project, MemberOut, Sprint, Task } from "../services/api";
import { Layout } from "../components/Layout";
import { SearchFilters } from "../components/SearchFilters";
import { KanbanBoard } from "../components/KanbanBoard";
import { SprintTab } from "../components/SprintTab";
import { DashboardTab } from "../components/DashboardTab";
import { MembersTab } from "../components/MembersTab";
import { TaskDetailModal } from "../components/TaskDetailModal";
import { 
  FolderGit2, 
  Layers, 
  Users, 
  TrendingUp, 
  KanbanSquare 
} from "lucide-react";

type TabId = "kanban" | "sprints" | "dashboard" | "members";

export const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<MemberOut[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync active tab to URL search params or fallback to 'kanban'
  const activeTab = (searchParams.get("tab") as TabId) || "kanban";

  const fetchProjectData = async () => {
    if (!id) return;
    try {
      const proj = await api.projects.get(id);
      setProject(proj);
      
      const mems = await api.projects.listMembers(id);
      setMembers(mems);

      const sprts = await api.sprints.list(id);
      setSprints(sprts);

      // Fetch tasks based on active filters (which are loaded inside components or globally)
      // For global list, we load all tasks for the board
      const ts = await api.tasks.list(id);
      setTasks(ts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchProjectData();
  }, [id]);

  const handleTabChange = (tab: TabId) => {
    const currentParams = Object.fromEntries(searchParams.entries());
    setSearchParams({ ...currentParams, tab });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-20 text-slate-500">
          Không tìm thấy dự án hoặc bạn không có quyền truy cập.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        
        {/* Project Header block */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400">
              <FolderGit2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 leading-tight">{project.name}</h2>
              <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Trạng thái: {project.status}</p>
            </div>
          </div>
          {project.description && (
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">{project.description}</p>
          )}
        </div>

        {/* Dynamic Nav Tabs */}
        <div className="flex border-b border-slate-900 overflow-x-auto pb-px">
          <button
            onClick={() => handleTabChange("kanban")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 ${
              activeTab === "kanban" 
                ? "border-cyan-400 text-cyan-400" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <KanbanSquare className="h-4 w-4" />
            <span>Bảng Kanban</span>
          </button>
          
          <button
            onClick={() => handleTabChange("sprints")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 ${
              activeTab === "sprints" 
                ? "border-cyan-400 text-cyan-400" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Sprints / Tasks</span>
          </button>

          <button
            onClick={() => handleTabChange("dashboard")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 ${
              activeTab === "dashboard" 
                ? "border-cyan-400 text-cyan-400" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>Thống kê</span>
          </button>

          <button
            onClick={() => handleTabChange("members")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition shrink-0 ${
              activeTab === "members" 
                ? "border-cyan-400 text-cyan-400" 
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Thành viên</span>
          </button>
        </div>

        {/* Render Tab Contents */}
        <div className="space-y-6">
          {activeTab === "kanban" && (
            <>
              {/* Search filter row */}
              <SearchFilters members={members} sprints={sprints} />
              
              {/* Kanban board view */}
              <KanbanBoard 
                projectId={project.id} 
                members={members} 
                sprints={sprints} 
                tasks={tasks}
                onTasksUpdated={fetchProjectData}
              />
            </>
          )}

          {activeTab === "sprints" && (
            <SprintTab 
              projectId={project.id}
              members={members}
              sprints={sprints}
              tasks={tasks}
              onSprintsUpdated={fetchProjectData}
              onTasksUpdated={fetchProjectData}
            />
          )}

          {activeTab === "dashboard" && (
            <DashboardTab projectId={project.id} />
          )}

          {activeTab === "members" && (
            <MembersTab 
              projectId={project.id} 
              members={members}
              onMembersUpdated={fetchProjectData}
            />
          )}
        </div>

        {/* Global Task details modal sync to ?task query string */}
        <TaskDetailModal 
          projectId={project.id}
          members={members}
          sprints={sprints}
          onTasksUpdated={fetchProjectData}
        />

      </div>
    </Layout>
  );
};
