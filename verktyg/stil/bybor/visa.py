import os, sys
sys.argv = sys.argv[:1]
HAR = '/home/claude/bybor'; os.chdir(HAR)
exec(open('bybor.py').read())
from PIL import Image
INK = '/home/claude/inkorg/figurer/'
GRAS = (126, 170, 74, 255); GRAS2 = (112, 156, 66, 255)
def visa(bilder, fil, skala=6):
    B = 6 + 5 * 28; H = 6 + len(bilder) * 30 + 30
    ov = Image.new('RGBA', (B, H), GRAS)
    for y in range(H):
        for x in range(B):
            if (x // 4 + y // 4 * 3) % 7 == 0: ov.putpixel((x, y), GRAS2)
    def stall(im, x, yb):
        sk = Image.new('RGBA', (16, 4), (0, 0, 0, 0))
        for yy in range(4):
            for xx in range(16):
                if ((xx + .5 - 8) / 6) ** 2 + ((yy + .5 - 2) / 1.6) ** 2 <= 1: sk.putpixel((xx, yy), (20, 30, 10, 90))
        ov.alpha_composite(sk, (x + im.width // 2 - 8, yb - 3))
        ov.alpha_composite(im, (x, yb - im.height))
    y = 30
    stall(Image.open(INK + 'hjalte/hjalte_ga_ner_01.png').convert('RGBA'), 8, y)
    stall(Image.open(INK + 'farfar/farfar_morgon_ner_01.png').convert('RGBA'), 36, y)
    stall(Image.open(INK + 'hjalte/hjalte_ga_hoger_01.png').convert('RGBA'), 64, y)
    stall(Image.open(INK + 'farfar/farfar_morgon_upp_01.png').convert('RGBA'), 92, y)
    for r, (namn, d) in enumerate(bilder.items()):
        yb = 60 + r * 30
        for c, rikt in enumerate(('ner', 'hoger', 'vanster', 'upp')):
            im = d[rikt]; stall(im, 8 + c * 28 + (16 - im.width) // 2, yb)
    ov.resize((B * skala, H * skala), Image.NEAREST).save(fil)
if __name__ == '__main__':
    visa(alla(), '/tmp/bybor_prov.png')
