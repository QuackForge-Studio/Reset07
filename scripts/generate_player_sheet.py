import os
import math
import numpy as np
from PIL import Image, ImageDraw

# Grid specs
COLS, ROWS = 6, 3
CELL_SIZE = 64
WIDTH, HEIGHT = COLS * CELL_SIZE, ROWS * CELL_SIZE # 384 x 192

# Scale factor for crisp anti-alias free vector drawing
SCALE = 8 # Draw at 8x resolution (512x512 per cell), then downsample with crisp thresholding

# Strict 6-color palette (RGB tuples)
PALETTE_RGB = [
    (7, 10, 15),       # #070A0F - near-black
    (16, 24, 38),      # #101826 - deep navy
    (56, 232, 255),    # #38E8FF - emergency cyan
    (255, 106, 26),    # #FF6A1A - reactor orange
    (255, 61, 154),    # #FF3D9A - corruption magenta
    (244, 248, 255),   # #F4F8FF - signal white
]

PAL = {
    'near_black': (7, 10, 15, 255),
    'navy': (16, 24, 38, 255),
    'cyan': (56, 232, 255, 255),
    'orange': (255, 106, 26, 255),
    'magenta': (255, 61, 154, 255),
    'white': (244, 248, 255, 255),
}

def draw_cell(d, row, col):
    """
    Draw K-07 inside a 64x64 cell scaled up by SCALE factor.
    Center of cell is (32 * SCALE, 32 * SCALE).
    """
    S = SCALE
    cx = (col * 64 + 32) * S
    cy = (row * 64 + 32) * S
    pose = col # 0..5

    # Animation parameters per column
    # COL 0-1: idle (subtle breathing bob)
    # COL 2-3: walk cycle (two-step stride, body bobbing)
    # COL 4-5: shooting (rifle recoils back, muzzle flash, body leaning)

    bob_y = 0
    sway_x = 0
    recoil_x = 0
    recoil_y = 0

    if pose == 1: # Idle bob
        bob_y = 1 * S
    elif pose == 2: # Walk A
        bob_y = -1 * S
        sway_x = -1.5 * S
    elif pose == 3: # Walk B
        bob_y = 1 * S
        sway_x = 1.5 * S
    elif pose == 4: # Shoot 1 (full recoil + big muzzle flash)
        bob_y = 0
        if row == 0: # Down
            recoil_y = -2 * S # lean back (up)
        elif row == 1: # Right
            recoil_x = -3 * S # lean left
        elif row == 2: # Up
            recoil_y = 2 * S # lean back (down)
    elif pose == 5: # Shoot 2 (recoil recovery + small muzzle flash)
        if row == 0:
            recoil_y = -1 * S
        elif row == 1:
            recoil_x = -1 * S
        elif row == 2:
            recoil_y = 1 * S

    ox = cx + sway_x + recoil_x
    oy = cy + bob_y + recoil_y

    # =========================================================================
    # ROW 0: FACING DOWN (FRONT VIEW)
    # =========================================================================
    if row == 0:
        # Ground shadow (near-black)
        d.ellipse([ox - 15*S, oy + 17*S, ox + 15*S, oy + 25*S], fill=PAL['near_black'])

        # Boots
        if pose == 2: # stride A
            d.rounded_rectangle([ox - 12*S, oy + 10*S, ox - 3*S, oy + 21*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
            d.rounded_rectangle([ox + 2*S, oy + 14*S, ox + 11*S, oy + 23*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
        elif pose == 3: # stride B
            d.rounded_rectangle([ox - 11*S, oy + 14*S, ox - 2*S, oy + 23*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
            d.rounded_rectangle([ox + 3*S, oy + 10*S, ox + 12*S, oy + 21*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
        else: # standing
            d.rounded_rectangle([ox - 11*S, oy + 13*S, ox - 3*S, oy + 22*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
            d.rounded_rectangle([ox + 3*S, oy + 13*S, ox + 11*S, oy + 22*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)

        # Backpack peeking behind shoulders
        d.rounded_rectangle([ox - 17*S, oy - 10*S, ox + 17*S, oy + 4*S], radius=4*S, fill=PAL['near_black'], outline=PAL['navy'], width=S)
        # Orange energy module peeking top
        d.rectangle([ox - 4*S, oy - 12*S, ox + 4*S, oy - 9*S], fill=PAL['orange'])

        # Torso Main Armor (Deep Navy)
        d.rounded_rectangle([ox - 13*S, oy - 7*S, ox + 13*S, oy + 12*S], radius=5*S, fill=PAL['navy'])
        d.rounded_rectangle([ox - 10*S, oy - 5*S, ox + 10*S, oy + 9*S], radius=3*S, fill=PAL['near_black'])

        # Chest Core Light (Cyan glowing core)
        d.ellipse([ox - 4*S, oy - 1*S, ox + 4*S, oy + 7*S], fill=PAL['cyan'])
        d.ellipse([ox - 2*S, oy + 1*S, ox + 2*S, oy + 5*S], fill=PAL['white'])

        # Belt / Utility status lights (Reactor Orange & Magenta)
        d.rectangle([ox - 8*S, oy + 9*S, ox - 4*S, oy + 11*S], fill=PAL['orange'])
        d.rectangle([ox + 4*S, oy + 8*S, ox + 7*S, oy + 10*S], fill=PAL['magenta'])

        # Shoulder Pads (Left & Right) with Cyan Rings
        # Left shoulder pad
        d.ellipse([ox - 19*S, oy - 9*S, ox - 9*S, oy + 1*S], fill=PAL['navy'])
        d.ellipse([ox - 18*S, oy - 8*S, ox - 10*S, oy + 0*S], outline=PAL['cyan'], width=S)
        # Right shoulder pad
        d.ellipse([ox + 9*S, oy - 9*S, ox + 19*S, oy + 1*S], fill=PAL['navy'])
        d.ellipse([ox + 10*S, oy - 8*S, ox + 18*S, oy + 0*S], outline=PAL['cyan'], width=S)

        # Arms & Hands
        d.rounded_rectangle([ox - 17*S, oy + 1*S, ox - 11*S, oy + 11*S], radius=2*S, fill=PAL['navy'])
        d.rounded_rectangle([ox + 11*S, oy + 1*S, ox + 17*S, oy + 11*S], radius=2*S, fill=PAL['navy'])

        # Slim Rifle (held in right hand, pointing forward/down)
        rx = ox + 12*S
        ry = oy + 3*S + (2*S if pose in (4, 5) else 0)
        # Rifle body
        d.rectangle([rx, ry, rx + 5*S, ry + 16*S], fill=PAL['near_black'])
        d.rectangle([rx + 1*S, ry + 3*S, rx + 4*S, ry + 10*S], fill=PAL['navy'])
        # Muzzle tip glowing cyan
        d.rectangle([rx + 1*S, ry + 14*S, rx + 4*S, ry + 18*S], fill=PAL['cyan'])

        # Muzzle Flash on shooting poses (4, 5)
        if pose in (4, 5):
            flash_r = 7*S if pose == 4 else 4*S
            fy = ry + 18*S
            fx = rx + 2.5*S
            # Cyan outer flash burst
            d.polygon([
                (fx, fy + flash_r * 1.6),
                (fx - flash_r, fy + flash_r * 0.4),
                (fx - flash_r * 0.4, fy + flash_r * 0.2),
                (fx, fy),
                (fx + flash_r * 0.4, fy + flash_r * 0.2),
                (fx + flash_r, fy + flash_r * 0.4)
            ], fill=PAL['cyan'])
            # White core flash
            d.ellipse([fx - 2*S, fy, fx + 2*S, fy + 4*S], fill=PAL['white'])

        # Helmet (top-down view facing down)
        d.ellipse([ox - 11*S, oy - 20*S, ox + 11*S, oy + 1*S], fill=PAL['navy'])
        d.ellipse([ox - 10*S, oy - 19*S, ox + 10*S, oy + 0*S], outline=PAL['near_black'], width=S)

        # Cyan Glowing Visor Band across helmet (visor facing DOWN)
        d.rounded_rectangle([ox - 9*S, oy - 10*S, ox + 9*S, oy - 3*S], radius=2*S, fill=PAL['cyan'])
        # Visor signal white reflection glint
        d.rectangle([ox - 6*S, oy - 9*S, ox - 2*S, oy - 7*S], fill=PAL['white'])

    # =========================================================================
    # ROW 1: FACING RIGHT (PROFILE VIEW)
    # =========================================================================
    elif row == 1:
        # Ground shadow
        d.ellipse([ox - 12*S, oy + 17*S, ox + 14*S, oy + 25*S], fill=PAL['near_black'])

        # Stride / Feet (facing right)
        if pose == 2: # walk A
            d.rounded_rectangle([ox + 4*S, oy + 12*S, ox + 14*S, oy + 22*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
            d.rounded_rectangle([ox - 12*S, oy + 10*S, ox - 2*S, oy + 20*S], radius=2*S, fill=PAL['near_black'])
        elif pose == 3: # walk B
            d.rounded_rectangle([ox - 8*S, oy + 12*S, ox + 2*S, oy + 22*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
            d.rounded_rectangle([ox + 2*S, oy + 10*S, ox + 12*S, oy + 20*S], radius=2*S, fill=PAL['near_black'])
        else: # standing
            d.rounded_rectangle([ox - 6*S, oy + 12*S, ox + 5*S, oy + 22*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)

        # Backpack on back (left side of profile view)
        d.rounded_rectangle([ox - 16*S, oy - 12*S, ox - 6*S, oy + 6*S], radius=3*S, fill=PAL['near_black'], outline=PAL['navy'], width=S)
        # Orange & Cyan status indicators on backpack
        d.rectangle([ox - 15*S, oy - 7*S, ox - 13*S, oy - 2*S], fill=PAL['orange'])
        d.rectangle([ox - 15*S, oy + 0*S, ox - 13*S, oy + 3*S], fill=PAL['cyan'])

        # Torso Main Armor (profile view)
        d.rounded_rectangle([ox - 7*S, oy - 8*S, ox + 8*S, oy + 11*S], radius=4*S, fill=PAL['navy'])
        d.rectangle([ox - 5*S, oy - 6*S, ox + 6*S, oy + 8*S], fill=PAL['near_black'])

        # Chest Core Light visible at right edge of torso
        d.rounded_rectangle([ox + 5*S, oy - 2*S, ox + 8*S, oy + 5*S], radius=S, fill=PAL['cyan'])
        d.rectangle([ox + 6*S, oy + 0*S, ox + 7*S, oy + 3*S], fill=PAL['white'])

        # Shoulder Pad (centered profile)
        d.ellipse([ox - 4*S, oy - 9*S, ox + 6*S, oy + 1*S], fill=PAL['navy'])
        d.ellipse([ox - 3*S, oy - 8*S, ox + 5*S, oy + 0*S], outline=PAL['cyan'], width=S)
        d.rectangle([ox, oy - 5*S, ox + 2*S, oy - 3*S], fill=PAL['magenta']) # Corruption magenta detail

        # Helmet facing RIGHT
        d.ellipse([ox - 7*S, oy - 20*S, ox + 11*S, oy + 1*S], fill=PAL['navy'])
        d.ellipse([ox - 6*S, oy - 19*S, ox + 10*S, oy + 0*S], outline=PAL['near_black'], width=S)
        
        # Cyan Visor Band protruding RIGHT
        d.rounded_rectangle([ox + 2*S, oy - 14*S, ox + 12*S, oy - 6*S], radius=2*S, fill=PAL['cyan'])
        d.rectangle([ox + 4*S, oy - 13*S, ox + 8*S, oy - 10*S], fill=PAL['white'])

        # Slim Rifle held in hands, pointing RIGHT
        rx = ox + 4*S + (recoil_x if pose in (4, 5) else 0)
        ry = oy + 1*S
        # Rifle body
        d.rectangle([rx, ry - 3*S, rx + 18*S, ry + 3*S], fill=PAL['near_black'])
        d.rectangle([rx + 4*S, ry - 2*S, rx + 12*S, ry + 2*S], fill=PAL['navy'])
        # Muzzle tip glowing cyan
        d.rectangle([rx + 18*S, ry - 3*S, rx + 22*S, ry + 3*S], fill=PAL['cyan'])

        # Muzzle flash pointing RIGHT on shooting poses (4, 5)
        if pose in (4, 5):
            flash_w = 12*S if pose == 4 else 6*S
            flash_h = 10*S if pose == 4 else 5*S
            fx = rx + 22*S
            # Cyan flash cone
            d.polygon([
                (fx, ry),
                (fx + flash_w * 0.7, ry - flash_h),
                (fx + flash_w, ry),
                (fx + flash_w * 0.7, ry + flash_h)
            ], fill=PAL['cyan'])
            # White core flash
            d.ellipse([fx - S, ry - 3*S, fx + 5*S, ry + 3*S], fill=PAL['white'])

    # =========================================================================
    # ROW 2: FACING UP (BACK VIEW)
    # =========================================================================
    elif row == 2:
        # Ground shadow
        d.ellipse([ox - 15*S, oy + 17*S, ox + 15*S, oy + 25*S], fill=PAL['near_black'])

        # Boots (back view)
        if pose == 2: # stride A
            d.rounded_rectangle([ox - 12*S, oy + 14*S, ox - 3*S, oy + 23*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
            d.rounded_rectangle([ox + 2*S, oy + 10*S, ox + 11*S, oy + 21*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
        elif pose == 3: # stride B
            d.rounded_rectangle([ox - 11*S, oy + 10*S, ox - 2*S, oy + 21*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
            d.rounded_rectangle([ox + 3*S, oy + 14*S, ox + 12*S, oy + 23*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
        else: # standing
            d.rounded_rectangle([ox - 11*S, oy + 13*S, ox - 3*S, oy + 22*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)
            d.rounded_rectangle([ox + 3*S, oy + 13*S, ox + 11*S, oy + 22*S], radius=2*S, fill=PAL['navy'], outline=PAL['near_black'], width=S)

        # Torso Back Armor
        d.rounded_rectangle([ox - 13*S, oy - 7*S, ox + 13*S, oy + 12*S], radius=5*S, fill=PAL['navy'])

        # PROMINENT BACKPACK (Centered in Back View)
        d.rounded_rectangle([ox - 13*S, oy - 9*S, ox + 13*S, oy + 8*S], radius=4*S, fill=PAL['near_black'], outline=PAL['navy'], width=S)
        d.rounded_rectangle([ox - 10*S, oy - 6*S, ox + 10*S, oy + 5*S], radius=2*S, fill=PAL['navy'])

        # Cyan Vents & Orange/Magenta reactor core on backpack
        d.rectangle([ox - 8*S, oy - 4*S, ox - 5*S, oy + 3*S], fill=PAL['cyan'])
        d.rectangle([ox + 5*S, oy - 4*S, ox + 8*S, oy + 3*S], fill=PAL['cyan'])
        d.rectangle([ox - 3*S, oy - 4*S, ox + 3*S, oy + 0*S], fill=PAL['orange'])
        d.rectangle([ox - 3*S, oy + 2*S, ox + 3*S, oy + 4*S], fill=PAL['magenta'])

        # Shoulder Pads with Cyan Rings
        d.ellipse([ox - 19*S, oy - 9*S, ox - 9*S, oy + 1*S], fill=PAL['navy'])
        d.ellipse([ox - 18*S, oy - 8*S, ox - 10*S, oy + 0*S], outline=PAL['cyan'], width=S)
        d.ellipse([ox + 9*S, oy - 9*S, ox + 19*S, oy + 1*S], fill=PAL['navy'])
        d.ellipse([ox + 10*S, oy - 8*S, ox + 18*S, oy + 0*S], outline=PAL['cyan'], width=S)

        # Arms
        d.rounded_rectangle([ox - 17*S, oy + 1*S, ox - 11*S, oy + 11*S], radius=2*S, fill=PAL['navy'])
        d.rounded_rectangle([ox + 11*S, oy + 1*S, ox + 17*S, oy + 11*S], radius=2*S, fill=PAL['navy'])

        # Slim Rifle (pointing UP over right shoulder)
        rx = ox + 12*S
        ry = oy - 22*S + (2*S if pose in (4, 5) else 0)
        # Rifle body
        d.rectangle([rx, ry + 4*S, rx + 5*S, ry + 20*S], fill=PAL['near_black'])
        d.rectangle([rx + 1*S, ry + 8*S, rx + 4*S, ry + 16*S], fill=PAL['navy'])
        # Muzzle tip glowing cyan
        d.rectangle([rx + 1*S, ry, rx + 4*S, ry + 4*S], fill=PAL['cyan'])

        # Muzzle flash pointing UP on shooting poses (4, 5)
        if pose in (4, 5):
            flash_r = 7*S if pose == 4 else 4*S
            fy = ry
            fx = rx + 2.5*S
            # Cyan flash burst
            d.polygon([
                (fx, fy - flash_r * 1.6),
                (fx - flash_r, fy - flash_r * 0.4),
                (fx - flash_r * 0.4, fy - flash_r * 0.2),
                (fx, fy),
                (fx + flash_r * 0.4, fy - flash_r * 0.2),
                (fx + flash_r, fy - flash_r * 0.4)
            ], fill=PAL['cyan'])
            # White core flash
            d.ellipse([fx - 2*S, fy - 4*S, fx + 2*S, fy], fill=PAL['white'])

        # Helmet (Back view - crown of head)
        d.ellipse([ox - 11*S, oy - 20*S, ox + 11*S, oy + 1*S], fill=PAL['navy'])
        d.ellipse([ox - 10*S, oy - 19*S, ox + 10*S, oy + 0*S], outline=PAL['near_black'], width=S)
        # Cyan glowing rim on helmet back
        d.arc([ox - 9*S, oy - 18*S, ox + 9*S, oy - 2*S], start=180, end=360, fill=PAL['cyan'], width=S)


# Create high-res canvas
hi_img = Image.new("RGBA", (WIDTH * SCALE, HEIGHT * SCALE), (0, 0, 0, 0))
d = ImageDraw.Draw(hi_img)

for r in range(ROWS):
    for c in range(COLS):
        draw_cell(d, r, c)

# Downsample to exact target resolution (384x192) using Resampling.BOX or LANCZOS
small_img = hi_img.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)

# Convert image to numpy array for strict color palette quantization
arr = np.array(small_img) # shape: (192, 384, 4)

# Separate RGB and Alpha
rgb = arr[:, :, :3].astype(np.float32)
alpha = arr[:, :, 3]

# Quantize non-transparent pixels strictly to one of the 6 palette colors
palette_arr = np.array(PALETTE_RGB, dtype=np.float32) # shape: (6, 3)

# Mask for transparent vs opaque
opaque_mask = alpha > 40

# Compute squared distance to each palette color for opaque pixels
# rgb shape: (H, W, 3), palette shape: (6, 3)
diff = rgb[:, :, np.newaxis, :] - palette_arr[np.newaxis, np.newaxis, :, :] # shape: (H, W, 6, 3)
dist_sq = np.sum(diff ** 2, axis=-1) # shape: (H, W, 6)
closest_color_idx = np.argmin(dist_sq, axis=-1) # shape: (H, W)

# Map RGB to closest palette color
quantized_rgb = palette_arr[closest_color_idx].astype(np.uint8)

# Reconstruct final RGBA array
final_arr = np.zeros_like(arr)
final_arr[:, :, :3] = quantized_rgb
final_arr[:, :, 3] = np.where(opaque_mask, 255, 0).astype(np.uint8)

final_img = Image.fromarray(final_arr, mode="RGBA")

# Save to destination
output_path = r"d:\QuackForge Studio\Projects\Reset07\public\art\sprites\player-sheet.png"
os.makedirs(os.path.dirname(output_path), exist_ok=True)
final_img.save(output_path, "PNG")
print(f"Successfully generated strictly quantized 384x192 sprite sheet at {output_path}")

# Verify color counts and specs
unique_colors = set()
for y in range(HEIGHT):
    for x in range(WIDTH):
        r, g, b, a = final_img.getpixel((x, y))
        if a > 0:
            unique_colors.add(f"#{r:02X}{g:02X}{b:02X}")

print("Unique Opaque Hex Colors in Image:", sorted(list(unique_colors)))
