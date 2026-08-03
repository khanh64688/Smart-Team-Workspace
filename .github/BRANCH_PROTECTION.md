# Chặn merge khi CI đỏ

File `ci.yml` chỉ **báo** đỏ hay xanh. Việc **chặn nút Merge** là cấu hình phía
GitHub, phải bật một lần bởi người sở hữu repo. Chưa bật thì PR đỏ vẫn merge được.

---

## Bước 0 — Tạo nhánh `develop`

Repo hiện chưa có nhánh `develop`, trong khi CI được cấu hình chạy cho PR vào
nhánh này. Tạo trước:

```bash
git fetch origin
git checkout -b develop origin/main   # hoặc origin/Scrum-Master-+-Requirements
git push -u origin develop
```

Rồi đặt `develop` làm nhánh mặc định của repo:
**Settings → General → Default branch → đổi sang `develop`**.
Nhờ vậy PR mới sẽ tự nhắm vào `develop` thay vì `main`, khỏi phải nhớ đổi tay.

---

## Bước 1 — Bật branch protection (giao diện web)

Vào **Settings → Branches → Add branch ruleset** (hoặc *Add rule* ở repo cũ),
áp cho `develop` và `main`:

| Mục | Đặt là | Vì sao |
|---|---|---|
| Require a pull request before merging | ✅ | Không ai push thẳng vào `develop` |
| Required approvals | `1` | Đúng quy ước trong README |
| Dismiss stale approvals when new commits are pushed | ✅ | Approve xong lại push code mới thì phải review lại |
| Require status checks to pass | ✅ | **Đây là mục chặn CI đỏ** |
| ↳ Status check bắt buộc | **`CI passed`** | Xem giải thích bên dưới |
| Require branches to be up to date before merging | ✅ | Bắt rebase/merge `develop` mới nhất trước, tránh gãy sau khi merge |
| Require conversation resolution before merging | ✅ | Không bỏ sót góp ý của người review |
| Do not allow bypassing the above settings | ✅ | Kể cả admin cũng không lách được |

### Vì sao chỉ chọn `CI passed`

Workflow có 4 job kiểm tra (`Lint backend`, `Test backend`, `Build frontend`,
`Kiểm tra cấu hình Docker`). Job thứ năm — `CI passed` — chờ cả 4 job kia rồi
mới kết luận.

Chỉ cần chọn **`CI passed`** làm required check. Sau này thêm job mới thì chỉ
sửa `needs:` trong `ci.yml`, không phải vào Settings sửa lại danh sách.

> Lưu ý: `CI passed` chỉ hiện trong danh sách chọn sau khi workflow đã chạy ít
> nhất một lần. Mở một PR nháp vào `develop` để CI chạy, rồi quay lại bật.

---

## Bước 2 — Cách làm nhanh bằng `gh` CLI

```bash
gh auth login

gh api -X PUT repos/khanh64688/Smart-Team-Workspace/branches/develop/protection \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["CI passed"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "allow_force_pushes": false,
  "allow_deletions": false
}
JSON
```

Chạy lại lệnh trên, thay `develop` bằng `main` để bảo vệ luôn nhánh `main`.

Kiểm tra đã bật chưa:

```bash
gh api repos/khanh64688/Smart-Team-Workspace/branches/develop/protection \
  --jq '.required_status_checks.contexts'
```

---

## Kiểm chứng

1. Tạo nhánh `test/ci`, cố tình viết một dòng Python sai chuẩn (ví dụ import
   một module rồi không dùng).
2. Mở PR vào `develop`.
3. Job **Lint backend (ruff)** đỏ → **CI passed** đỏ → nút *Merge pull request*
   chuyển sang xám, kèm dòng "Required statuses must pass before merging".
4. Sửa lỗi, push lại → CI xanh → nút Merge sáng lên.

Làm xong thì xoá nhánh `test/ci`.

---

## Ba lỗi hay gặp

**PR treo ở trạng thái "Expected — Waiting for status to be reported"**
Tên required check không khớp. Nó phải trùng đúng giá trị `name:` của job trong
`ci.yml`, tức là `CI passed` — không phải tên file, không phải `ci-passed`.

**Job bị skip nhưng PR vẫn merge được**
GitHub tính job `skipped` là đạt. Đây là lý do `ci-passed` dùng `if: always()`
kèm kiểm tra `contains(needs.*.result, 'failure')` thay vì chỉ dựa vào `needs:`.

**PR từ fork không chạy CI**
Repo bài tập nhóm nên cho cả nhóm quyền Write và làm việc trên nhánh trong cùng
repo, đừng fork. Nếu buộc phải fork, vào Settings → Actions bật
*Require approval for all external contributors*.
