# RESET//07 — AI Art Pipeline (Antigravity)

Workflow: **Pi viết prompt → bạn paste vào Antigravity UI → lưu PNG vào thư mục này → Pi tích hợp.**

## Thư mục

| Thư mục | Dùng cho |
|---|---|
| `public/art/sprites/` | Sprite in-game thay thế texgen (nền trong suốt, đúng kích thước canvas) |
| `public/art/concept/` | Concept art lớn cho Title / Loading / Ending |
| `public/art/backgrounds/` | Background art cho UI game |

Prompt chuẩn từng asset: xem `ART-PROMPTS.md` ở repo root.

## Khi đã lưu ảnh xong

Nói với Pi: *"ảnh đã vào public/art/..."* — Pi sẽ:
1. Kiểm tra kích thước + nền trong suốt (script audit)
2. Thêm loader texture trong Phaser (đăng ký key trùng tên texgen, fallback nếu thiếu)
3. Verify typecheck/test/smoke → deploy

## Quy tắc cứng

- **Canvas size của sprite = đúng kích thước trong ART-PROMPTS.md** (physics bodies phụ thuộc frame size — đổi là vỡ hitbox).
- Nền sprite **trong suốt** (transparent PNG), không viền trắng/đen, không chữ, không watermark.
- Palette CHỈ dùng 6 màu brand (xem prompts) — không thêm màu lạ.
