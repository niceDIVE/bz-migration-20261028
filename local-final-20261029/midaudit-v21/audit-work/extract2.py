import zipfile, os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

# --- docx 正文抽取 ---
src = r'C:\Users\WANG\.dsh\attachments\v1\files\54\5472992bcd7743b37ac5634fd5b65415dfeff9bc1f8b6bc7fa4b019d799b627f\中层审计处置回执.docx'
zf = zipfile.ZipFile(src)
xml = zf.read('word/document.xml').decode('utf-8')
paras = re.findall(r'<w:p[ >].*?</w:p>', xml, re.S)
lines = []
for p in paras:
    ts = re.findall(r'<w:t[^>]*>(.*?)</w:t>', p, re.S)
    t = ''.join(ts)
    t = t.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
    lines.append(t)
out = '\n'.join(lines)
open(r'F:\BaoZouyxt\midaudit-v21\audit-work\处置回执-extracted.txt', 'w', encoding='utf-8').write(out)
print('docx paragraphs:', len(paras), 'chars:', len(out))

# --- v2.2 zip 解包 ---
src2 = r'C:\Users\WANG\.dsh\attachments\v1\files\11\112eea0480753259a44c1fecee0ca8ad864e6796e030f0123e81a306e9b93651\bz-oracle-v2.2.zip'
dst = r'F:\BaoZouyxt\audit-v22'
zf2 = zipfile.ZipFile(src2)
ok = 0
for info in zf2.infolist():
    try:
        name = info.orig_filename.encode('cp437').decode('utf-8')
    except Exception:
        name = info.orig_filename
    if name.endswith('/'):
        os.makedirs(os.path.join(dst, name), exist_ok=True)
        ok += 1
        continue
    name = name.replace('\\', '/')
    if name.startswith('/') or '..' in name.split('/'):
        print('SKIP unsafe:', name)
        continue
    target = os.path.join(dst, name)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with zf2.open(info) as f, open(target, 'wb') as g:
        g.write(f.read())
    ok += 1
print('zip extracted entries:', ok)
