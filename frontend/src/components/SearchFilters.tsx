import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, UserMinus } from "lucide-react";
import { MemberOut, Sprint } from "../services/api";

interface SearchFiltersProps {
  members: MemberOut[];
  sprints: Sprint[];
}

export const SearchFilters: React.FC<SearchFiltersProps> = ({ members, sprints }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Local state for debounced search term
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");

  // Debounce search term to URL
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const currentParams = Object.fromEntries(searchParams.entries());
      if (searchTerm.trim()) {
        setSearchParams({ ...currentParams, q: searchTerm });
      } else {
        const { q, ...rest } = currentParams;
        setSearchParams(rest);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchTerm(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleFilterChange = (key: string, value: string) => {
    const currentParams = Object.fromEntries(searchParams.entries());
    if (value && value !== "ALL") {
      setSearchParams({ ...currentParams, [key]: value });
    } else {
      const { [key]: _, ...rest } = currentParams;
      setSearchParams(rest);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentParams = Object.fromEntries(searchParams.entries());
    if (e.target.checked) {
      setSearchParams({ ...currentParams, overdue: "true" });
    } else {
      const { overdue, ...rest } = currentParams;
      setSearchParams(rest);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSearchParams({});
  };

  const currentSprint = searchParams.get("sprint_id") ?? "ALL";
  const currentAssignee = searchParams.get("assignee_id") ?? "ALL";
  const currentPriority = searchParams.get("priority") ?? "ALL";
  const currentStatus = searchParams.get("status") ?? "ALL";
  const isOverdue = searchParams.get("overdue") === "true";

  const hasActiveFilters = 
    searchTerm || 
    currentSprint !== "ALL" || 
    currentAssignee !== "ALL" || 
    currentPriority !== "ALL" || 
    currentStatus !== "ALL" || 
    isOverdue;

  return (
    <div className="rounded-xl border border-slate-900 bg-slate-950/40 p-4 space-y-4 shadow-md backdrop-blur">
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm công việc theo tiêu đề hoặc mô tả..."
            className="w-full rounded-lg border border-slate-900 bg-slate-900/60 py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 transition focus:border-cyan-500/80 focus:outline-none"
          />
        </div>

        {/* Filters Dropdown Actions */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Sprint Filter */}
          <select
            value={currentSprint}
            onChange={(e) => handleFilterChange("sprint_id", e.target.value)}
            className="rounded-lg border border-slate-900 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-400 focus:border-cyan-500/80 focus:outline-none"
          >
            <option value="ALL">Tất cả Sprint</option>
            <option value="BACKLOG">Backlog (Chưa chia)</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.status === "ACTIVE" ? "Đang chạy" : "Đã đóng"})
              </option>
            ))}
          </select>

          {/* Assignee Filter */}
          <select
            value={currentAssignee}
            onChange={(e) => handleFilterChange("assignee_id", e.target.value)}
            className="rounded-lg border border-slate-900 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-400 focus:border-cyan-500/80 focus:outline-none"
          >
            <option value="ALL">Tất cả người phụ trách</option>
            <option value="UNASSIGNED">Chưa phân công</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.full_name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={currentPriority}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            className="rounded-lg border border-slate-900 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-400 focus:border-cyan-500/80 focus:outline-none"
          >
            <option value="ALL">Mọi độ ưu tiên</option>
            <option value="LOW">Thấp</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HIGH">Cao</option>
            <option value="URGENT">Khẩn cấp</option>
          </select>

          {/* Status Filter */}
          <select
            value={currentStatus}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="rounded-lg border border-slate-900 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-400 focus:border-cyan-500/80 focus:outline-none"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="TODO">Cần làm</option>
            <option value="IN_PROGRESS">Đang làm</option>
            <option value="REVIEW">Đánh giá</option>
            <option value="DONE">Hoàn thành</option>
          </select>

          {/* Overdue Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none rounded-lg border border-slate-900 bg-slate-900/40 px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-900/80 transition">
            <input
              type="checkbox"
              checked={isOverdue}
              onChange={handleCheckboxChange}
              className="accent-cyan-400 cursor-pointer h-3.5 w-3.5"
            />
            <span className="text-red-400 font-bold">Trễ hạn</span>
          </label>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/20 hover:bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-bold transition"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
