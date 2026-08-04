# RESET//07 — ART PROMPTS (cho Antigravity / Gemini image gen)

Dán nguyên đoạn prompt tiếng Anh vào Antigravity. Lưu file theo đúng tên + thư mục ở đầu mỗi mục. Sau khi tạo xong tất cả, báo Pi để tích hợp.

## 0. Style base (thêm vào đầu mọi prompt sprite)

```
Flat vector game sprite, top-down 2D view, neon sci-fi city aesthetic,
strict 6-color palette only: #070A0F (near-black), #101826 (deep navy),
#38E8FF (emergency cyan), #FF6A1A (reactor orange), #FF3D9A (corruption
magenta), #F4F8FF (signal white). No gradients outside these hues, no text,
no watermark, no background, no drop shadow. Clean silhouette readable at
small size. Crisp pixel-perfect edges.
```

---

## A. SPRITES IN-GAME (nền TRONG SUỐT, đúng kích thước pixel canvas)

### A1. Player K-07 → `public/art/sprites/player.png` (64×64)
```
Top-down soldier K-07, single character centered in 64x64 canvas, facing UP.
Deep navy armor #101826 with cyan #38E8FF glowing visor band across the
helmet, cyan ring on shoulder pads, small cyan chest core light. Carries a
slim rifle pointing up in the right hand, cyan glowing muzzle tip. Backpack
behind shoulders. Minimal detail, chunky shapes readable at 64px.
```
*Ghi chú: physics body: circle radius 14 offset (16,18). Hướng lên = mặc định.*

### A1s. Player K-07 sprite sheet (ANIMATION) → `public/art/sprites/player-sheet.png` (384×192)
```
Sprite sheet for a top-down 2D game character. EXACTLY 384x192 pixels, a
strict grid of 6 columns x 3 rows, every cell exactly 64x64 pixels, no
gaps between cells. The SAME character in all 18 cells: top-down soldier
K-07 — deep navy armor #101826, cyan #38E8FF glowing visor band across
the helmet, cyan ring on shoulder pads, small cyan chest core light, slim
rifle with cyan glowing muzzle tip, backpack behind shoulders. Flat vector
style, strict 6-color palette only: #070A0F, #101826, #38E8FF, #FF6A1A,
#FF3D9A, #F4F8FF. Transparent background, no text, no watermark, no drop
shadow. Only the pose changes between cells:

- ROW 0 (top) = character facing DOWN (visor toward the viewer's bottom).
- ROW 1 (middle) = character facing RIGHT (profile view, rifle in hand).
- ROW 2 (bottom) = character facing UP (backpack visible, back view).

Within every row, the 6 columns are:
- COL 0-1 = idle: standing, subtle breathing bob.
- COL 2-3 = walk cycle: two-step stride, body bobbing up and down.
- COL 4-5 = shooting: rifle recoils back, muzzle flash on the rifle tip,
  body leaning back slightly.

Keep the character fully inside its 64x64 cell with a small margin; never
touch cell borders. All cells must show the exact same armor design.
```
*A1s thay thế A1 khi có sheet; chưa có sheet thì game tự dùng sheet placeholder procedural.*

### A2. Patrol Drone → `public/art/sprites/enemy-drone.png` (40×40)
```
Quadcopter combat drone, centered in 40x40 canvas, facing RIGHT (front = +X).
Four diagonal rotor arms with spinning rotor disks, dark navy chassis
#101826, ONE large glowing magenta #FF3D9A sensor eye in the center front,
small cyan #38E8FF engine lights on rotor tips. Weapon pod under the front
with a tiny muzzle. Minimal detail, readable silhouette.
```

### A3. Hunter Drone → `public/art/sprites/enemy-hunter.png` (40×40)
```
Aggressive attack drone, centered in 40x40 canvas, facing RIGHT (front = +X).
Winged arrowhead body, deep navy #101826 with magenta #FF3D9A energy core in
the middle, two forward spikes like claws, orange #FF6A1A thruster glow at
the back. Menacing, minimal, readable at 40px.
```

### A4. Shield Unit → `public/art/sprites/enemy-shield.png` (44×44)
```
Heavy shielded combat drone, centered in 44x44 canvas, facing RIGHT (front =
+X). Large hexagonal riot-shield on the front side glowing cyan #38E8FF,
dark navy armored body #101826 behind it, magenta #FF3D9A single eye above
the shield, small thruster glow at back. Blocky, minimal, readable at 44px.
```

### A5. Detonator → `public/art/sprites/enemy-detonator.png` (32×32)
```
Small suicide-bomber drone, centered in 32x32 canvas, facing RIGHT (front =
+X). Tiny round body, dark navy #101826, with a glowing reactor-orange
#FF6A1A bomb core strapped in front and a blinking orange fuse light on top.
Readable at 32px — keep it VERY simple, chunky shapes only.
```

### A6. Boss Core Guardian → `public/art/sprites/boss.png` (160×160)
```
Massive floating core guardian boss, centered in 160x160 canvas, symmetrical
front view (front = +X, facing right). Giant armored ring/cage of deep navy
#101826 metal with cyan #38E8FF energy lines, surrounding a huge glowing
magenta #FF3D9A crystalline core in the center. Four articulated claw arms
extending outward, orange #FF6A1A reactor vents. Imperial, menacing, still
readable at small zoom. Minimal detail density — bold shapes.
```

### A7. Boss core (weak point) → `public/art/sprites/boss-core.png` (80×80)
```
Glowing energy core crystal, centered in 80x80 canvas. Diamond/octahedron
crystal with magenta #FF3D9A inner glow, cyan #38E8FF outer energy ring,
white #F4F8FF hot center. Transparent background, luminous but clean edges.
```

### A8. Gate → `public/art/sprites/gate.png` (64×64)
```
Closed blast door / security gate for a city street, centered in 64x64
canvas, viewed top-down. Two heavy navy #101826 metal slabs with cyan
#38E8FF hazard stripes and a vertical seam in the middle, small orange
#FF6A1A warning lights at the sides. Industrial, minimal.
```

### A9. City Core → `public/art/sprites/core.png` (96×96)
```
The city's power core, centered in 96x96 canvas, top-down. Ring of dark
navy #101826 machinery with rotating segments, glowing cyan #38E8FF plasma
channels, magenta #FF3D9A corruption cracks spreading from one edge, white
hot center. Readable, industrial-organic mix.
```

---

## B. CONCEPT ART (UI screens, không cần nền trong suốt)

### B1. Title screen backdrop → `public/art/concept/title-city.png` (1536×864)
```
Wide cinematic concept art, 1536x864, for a sci-fi game title screen.
A neon cyberpunk megacity at night viewed from elevated angle, endless
grid of streets and skyscrapers in deep navy #101826, cyan #38E8FF neon
signs and road lights, a massive broken clock tower in the distance with
magenta #FF3D9A glow, thin orange #FF6A1A warning lights on rooftops.
Heavy fog between buildings, moody, high contrast, NO text, NO logo,
NO characters. Vertical space at top-center darker for UI overlay.
```

### B2. Loading screen art → `public/art/concept/loading-loop.png` (1536×864)
```
Minimal cinematic concept art, 1536x864. A lone city street at night,
floodlights, rain-slick asphalt reflecting cyan #38E8FF neon, a distant
silhouette of a tall antenna tower, magenta #FF3D9A horizon glow, dark
#070A0F sky with faint grid lines like a targeting system. Desolate,
quiet, vertical center slightly darker for a progress bar overlay. No text.
```

### B3. K-07 portrait (memory/ending) → `public/art/concept/k07-portrait.png` (512×512)
```
Character portrait, 512x512, chest-up view. A futuristic soldier with
deep navy #101826 tactical armor and a helmet with a glowing cyan #38E8FF
visor band, subtle white glint. Background solid #070A0F with a faint cyan
hexagon pattern. Dramatic rim light in cyan and magenta #FF3D9A. Clean,
painted style, NO text.
```

### B4. Boss concept → `public/art/concept/boss-concept.png` (1024×1024)
```
Boss concept art, 1024x1024, dramatic 3/4 view of a giant floating core
guardian: armored deep-navy #101826 ring cage, magenta #FF3D9A crystalline
heart, cyan #38E8FF energy arcs, orange #FF6A1A vents. City ruins below for
scale. Dark #070A0F background, cinematic lighting, NO text.
```

---

## C. BACKGROUNDS (UI game)

### C1. Garage backdrop → `public/art/backgrounds/garage.png` (1920×1080)
```
Interior of a futuristic vehicle garage at night, 1920x1080, viewed straight
on. Concrete walls in deep navy #101826, cyan #38E8FF strip lights along
the ceiling, a large dark bay door at the back, tool cabinets and hanging
cables, orange #FF6A1A warning stripes on the floor. Slightly darker center
for UI panels. Clean, readable, NO text.
```

---

## Khi nào xong

- Sprite: đặt đúng file, đúng kích thước, nền trong suốt → báo Pi.
- Pi sẽ: audit (kích thước/alpha), đăng ký texture thay thế texgen, verify toàn bộ, deploy.
