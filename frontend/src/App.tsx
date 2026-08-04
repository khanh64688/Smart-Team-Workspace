// Trang tạm để hạ tầng có thứ để build. TV5 thay toàn bộ src/ bằng router,
// layout, AuthContext và các trang thật; giữ nguyên file cấu hình ở thư mục gốc.
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type BackendStatus = "checking" | "ok" | "error";

export default function App() {
  const [status, setStatus] = useState<BackendStatus>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${API_URL}/`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: { message?: string }) => {
        setStatus("ok");
        setMessage(data.message ?? "");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : String(error));
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Smart Team Workspace</h1>
      <p className="text-sm text-gray-500">
        Khung frontend đã sẵn sàng. Chờ TV5 dựng các trang thật.
      </p>

      <div className="rounded-lg border p-4 text-sm">
        <div className="font-medium">Kết nối backend</div>
        <div className="text-gray-500">{API_URL}</div>
        <div className="mt-2">
          {status === "checking" && "Đang kiểm tra…"}
          {status === "ok" && `Kết nối được — ${message}`}
          {status === "error" && `Không kết nối được — ${message}`}
        </div>
      </div>
    </main>
  );
}
