import json, io
d = json.load(io.open(r'F:\BaoZouyxt\audit-v23\relate-result-r2-20261024\relations.json', encoding='utf-8'))
print('top keys:', list(d.keys()))
m = d.get('__meta', {})
print('meta:', json.dumps(m, ensure_ascii=False))
for k, v in d.items():
    if k == '__meta': continue
    if isinstance(v, list) and v:
        print(k, 'list len', len(v), 'first:', json.dumps(v[0], ensure_ascii=False)[:300])
    elif isinstance(v, dict):
        print(k, 'dict len', len(v), 'first key:', list(v.keys())[:5])
    else:
        print(k, type(v).__name__, v if not isinstance(v,(list,dict)) else '')
