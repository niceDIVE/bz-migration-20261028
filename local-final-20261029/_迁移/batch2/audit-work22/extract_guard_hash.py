import json, re, hashlib, sys, zlib, struct
sys.stdout.reconfigure(encoding='utf-8')
PNG = r'F:\Gemini worktest\_github\apocalypse-lone-wolf\projects\apocalypse-lone-wolf\release\末世孤雄_HavenFramework_v1.png'
data = open(PNG, 'rb').read()
assert data[:8] == b'\x89PNG\r\n\x1a\n', 'not a png'
texts = {}
pos = 8
while pos < len(data):
    ln = struct.unpack('>I', data[pos:pos+4])[0]
    typ = data[pos+4:pos+8]
    chunk = data[pos+8:pos+8+ln]
    if typ == b'tEXt':
        k, _, v = chunk.partition(b'\x00')
        texts[k.decode('latin1')] = v.decode('utf-8', 'replace')
    elif typ == b'zTXt':
        k, _, rest = chunk.partition(b'\x00')
        texts[k.decode('latin1')] = zlib.decompress(rest[1:]).decode('utf-8', 'replace')
    pos += 12 + ln
    if typ == b'IEND':
        break
print('tEXt keys:', list(texts.keys()))
# 找卡数据（通常在 chara / ccv3 键，base64 JSON）
import base64
card = None
for k in ('ccv3', 'chara'):
    if k in texts:
        try:
            card = json.loads(base64.b64decode(texts[k]))
            print('card from key:', k)
            break
        except Exception as e:
            print(k, 'decode fail:', e)
def find_guard(o, path=''):
    hits = []
    if isinstance(o, dict):
        for kk, v in o.items():
            hits += find_guard(v, path + '/' + str(kk))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            hits += find_guard(v, path + f'[{i}]')
    elif isinstance(o, str) and 'haven_framework_guard' in o or (isinstance(o, str) and 'DAILY_FOOD' in o and 'function' in o):
        hits.append((path, o))
    return hits
hits = find_guard(card)
print('guard 候选数:', len(hits))
for path, src in hits:
    lf = src.replace('\r\n', '\n').encode('utf-8')
    print('path:', path[:120])
    print('LF sha256:', hashlib.sha256(lf).hexdigest())
    print('len:', len(lf))
