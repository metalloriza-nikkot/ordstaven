# Översikten av kapitel 3:s skiss: alla rum på ett ark, i dubbel storlek, med namnen.
from PIL import Image, ImageDraw, ImageFont
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
U = '/home/claude/skiss3/ut/'; S = 2; R = 34
def b(n): im = Image.open(U + n + '.png').convert('RGB'); return im.resize((im.width * S, im.height * S), Image.NEAREST)
rader = [[('01_floden_morgon', 'Floden, morgon: pråmarna, skepparen och kvarnen med hjulet insnott')],
         [('01_floden_on', 'Floden, ön vid kvarnens brygga')],
         [('01_floden_kvall', 'Floden, kvällen: resan på sköldpaddan')],
         [('02_kvarnen', 'Kvarnen: tavlan innanför dörren (101.5)'), ('03_loftet_rent', 'Loftet: hornet i luckan')],
         [('04_on', 'Ön: skalet ovanifrån'), ('05_sandbanken_luftskepp', 'Sandbanken (luftskeppets skugga)')]]
H = sum(192 * S + R for _ in rader)
c = Image.new('RGB', (640 * S, H), (40, 36, 32)); d = ImageDraw.Draw(c); y = 0
for rad in rader:
    x = 0
    for n, t in rad:
        im = b(n); c.paste(im, (x, y + R)); d.text((x + 8, y + 5), t, fill=(240, 232, 210), font=F); x += im.width
    y += 192 * S + R
c.save(U + '00_oversikt_k3_x2.png'); print(c.size)
