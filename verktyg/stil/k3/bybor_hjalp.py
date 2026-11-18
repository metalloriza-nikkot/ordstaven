def skilj(d, fram, bak, ton=1):
    """Där en främre del möter en bakre blir den bakres kant en skuggton (inre linje)."""
    for (x, y), nm in list(d.del_.items()):
        if nm == bak:
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if d.del_.get((x + dx, y + dy)) == fram:
                    m, t = d.px[(x, y)]
                    if m == 'fast': break
                    d.px[(x, y)] = (m, min(t, ton)); break
