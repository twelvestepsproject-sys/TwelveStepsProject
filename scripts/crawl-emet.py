# -*- coding: utf-8 -*-
"""Crawls emetmatrix.com's RSS feed into .content-emet/inventory.json.

The feed is the only structured export the site offers: there is no WP
REST API (404) and no sitemap (404). It does carry full `content:encoded`
bodies and the legacy ?p=<id> identifiers, which is what the redirect map
is built from, so it beats scraping rendered HTML.

Output is gitignored on purpose - see scripts/import-emet.mjs.

    cd .content-emet && python -I ../scripts/crawl-emet.py
"""

import re, io, os, urllib.request, json

UA = {"User-Agent": "Mozilla/5.0 (compatible; content-audit)"}
BASE = "https://emetmatrix.com/?feed=rss2&paged=%d"

def fetch(page):
    path = "feed-%d.xml" % page
    if os.path.exists(path) and os.path.getsize(path) > 500:
        return io.open(path, encoding="utf-8", errors="replace").read()
    req = urllib.request.Request(BASE % page, headers=UA)
    data = urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "replace")
    io.open(path, "w", encoding="utf-8").write(data)
    return data

ITEM = re.compile(r"<item>(.*?)</item>", re.S)
def field(block, tag):
    m = re.search(r"<%s>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</%s>" % (tag, tag), block, re.S)
    return m.group(1).strip() if m else ""

posts, page, seen = {}, 1, set()
while page <= 60:
    try:
        xml = fetch(page)
    except Exception as e:
        print("page %d failed: %s" % (page, e)); break
    blocks = ITEM.findall(xml)
    if not blocks:
        break
    new = 0
    for b in blocks:
        link = field(b, "link")
        pid = re.search(r"[?&]p=(\d+)", link)
        key = pid.group(1) if pid else link
        if key in seen:
            continue
        seen.add(key); new += 1
        body = re.search(r"<content:encoded><!\[CDATA\[(.*?)\]\]></content:encoded>", b, re.S)
        body = body.group(1) if body else ""
        cats = re.findall(r"<category[^>]*><!\[CDATA\[(.*?)\]\]></category>", b)
        posts[key] = {
            "id": key, "link": link, "title": field(b, "title"),
            "date": field(b, "pubDate"), "categories": cats,
            "chars": len(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", body)).strip()),
            "mosimage": body.count("{mosimage}"),
            "imgs": len(re.findall(r"<img[^>]+>", body)),
            "bare_refs": len(re.findall(r"[\w/]+\.(?:jpg|jpeg|png|gif)", body)),
            "body": body,
        }
    if new == 0:
        break
    page += 1

io.open("inventory.json", "w", encoding="utf-8").write(
    json.dumps(posts, ensure_ascii=False, indent=1))

tot = len(posts)
empty = sum(1 for p in posts.values() if p["chars"] < 120)
mos = sum(1 for p in posts.values() if p["mosimage"])
noimg = sum(1 for p in posts.values() if p["imgs"] == 0 and p["bare_refs"])
chars = sum(p["chars"] for p in posts.values())
cats = {}
for p in posts.values():
    for c in p["categories"]:
        cats[c] = cats.get(c, 0) + 1

print("pages crawled      : %d" % (page - 1))
print("unique posts       : %d" % tot)
print("total body text    : %s chars" % format(chars, ","))
print("median body        : %d chars" % sorted(p["chars"] for p in posts.values())[tot // 2])
print()
print("near-empty (<120c) : %d" % empty)
print("with {mosimage}    : %d" % mos)
print("bare img refs, no <img>: %d" % noimg)
print()
print("categories:")
for c, n in sorted(cats.items(), key=lambda x: -x[1])[:14]:
    print("   %-34s %d" % (c[:34], n))
