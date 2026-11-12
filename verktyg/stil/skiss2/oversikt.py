# Översikten: alla skisser på ett ark, i dubbel storlek, med namnen.
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
U = '/home/claude/skiss2/ut/'
S = 2
def b(n): im = Image.open(U + n + '.png').convert('RGB'); return im.resize((im.width * S, im.height * S), Image.NEAREST)
delar = [('01_trasket_efter', 0, 0, 'Träskkanten (efter vassväggen och BRO)'), ('05_vassen', 640, 0, 'Vassen'),
         ('02_byn_rep', 0, 192, 'Byn i pass 2 (repen)'), ('04_bryggan', 640, 192, 'Bryggan'), ('06_dammen', 960, 192, 'Dammen'),
         ('07_tant_rosas_hus', 640, 384, 'Tant Rosas hus'), ('02_byn_eld', 960, 384, 'Kvällen (byn, sydost)')]
R = 34
c = Image.new('RGB', (1280 * S, 576 * S + 3 * R), (40, 36, 32))
d = ImageDraw.Draw(c)
for n, x, y, t in delar:
    im = b(n)
    if n == '02_byn_eld': im = im.crop((320 * S, 192 * S, 640 * S, 384 * S))
    yy = y * S + (y // 192) * R + R
    c.paste(im, (x * S, yy)); d.text((x * S + 8, yy - R + 4), t, fill=(240, 232, 210), font=F)
c.save(U + '00_oversikt_x2.png'); print(c.size)
