"""Check deployed redirects, PHP and form configuration without sending any application."""
import json
import gzip
import hashlib
import re
import urllib.request
import urllib.error
import urllib.parse


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        return None



def assert_retention_popup(html, page):
    popup = re.search(r'<dialog\b[^>]*\bid="retention-modal"[\s\S]*?</dialog>', html)
    assert popup, 'Missing callback popup: ' + page
    inline = re.search(r'<style\b[^>]*\bid="retention-popup-styles"[^>]*>([\s\S]*?)</style>', html)
    assert inline, 'Missing inline callback popup styles: ' + page
    for selector in ['.retention-modal', '.retention-phone-field', '.retention-close']:
        assert selector in inline.group(1), 'Missing inline callback selector ' + selector + ': ' + page
    assert re.search(r'\.retention-phone-field\s*>\s*\.sr-only', inline.group(1)), 'Callback phone label is not hidden by inline styles: ' + page
    for svg in re.findall(r'<svg\b[^>]*>', popup.group(0)):
        for dimension in ['width', 'height']:
            bound = re.search(r'\b' + dimension + r'="(\d+)(?:px)?"', svg)
            assert bound and 0 < int(bound.group(1)) <= 32, 'Callback SVG needs bounded ' + dimension + ': ' + page


opener = urllib.request.build_opener(NoRedirect)
for old_path, target in [
    ('balkon-pod-klyuch', '/'),
    ('balkon-pod-klyuch/', '/'),
    ('balkon-pod-klyuch/index.html', '/'),
    ('lodzhiya-pod-klyuch/', '/'),
    ('mebel-dlya-balkona/', '/#complex-options'),
]:
    try:
        opener.open('https://artbalkon.site/' + old_path, timeout=30)
        raise AssertionError('Moved URL was served without a permanent redirect: ' + old_path)
    except urllib.error.HTTPError as error:
        assert error.code == 301, 'Moved URL must return HTTP 301: ' + old_path
        assert error.headers['Location'] == 'https://artbalkon.site' + target, 'Incorrect redirect destination: ' + old_path
print('Production permanent redirects verified.')

config = json.load(urllib.request.urlopen('https://artbalkon.site/site-config.json?mail-check=1', timeout=30))
assert config['leadEndpoint'] == '/api/leads.php', 'Production forms are disabled'
request = urllib.request.Request('https://artbalkon.site/api/leads.php', data=b'{}', headers={'Origin': 'https://artbalkon.site', 'Content-Type': 'application/json'})
try:
    urllib.request.urlopen(request, timeout=30)
    raise AssertionError('Empty form was accepted')
except urllib.error.HTTPError as error:
    result = json.load(error)
    assert error.code == 400 and result.get('ok') is False, 'PHP handler is not responding correctly'
print('Production configuration and PHP validation verified; no email sent.')


# Check all new landing URLs after FTP synchronization, without submitting a lead.
landing_slugs = [
    'osteklenie-balkona-s-vynosom', 'otdelka-balkona-pvh-panelyami',
    'otdelka-balkona-laminatom', 'otdelka-balkona-vagonkoj',
    'otdelka-balkona-kvarcvinilom', 'otdelka-balkona-derevom',
    'otdelka-balkona-mdf-panelyami', 'razdvizhnoe-osteklenie',
    'osteklenie-balkona-v-hrushchevke'
]
for slug in landing_slugs:
    url = 'https://artbalkon.site/' + slug + '/'
    html = urllib.request.urlopen(url, timeout=30).read().decode('utf-8')
    assert 'rel="canonical" href="' + url + '"' in html, 'Incorrect canonical: ' + slug
    assert html.count('data-comparison ') == 6, 'Expected six works: ' + slug
    gallery_heading = re.search(r'id="before-after"[\s\S]*?<h2\b[^>]*>([\s\S]*?)</h2>', html)
    assert gallery_heading and re.sub(r'<[^>]*>', '', gallery_heading.group(1)).strip(), 'Missing project gallery heading: ' + slug
    assert 'визуализац' not in html.lower(), 'Customer-facing copy and metadata must remain neutral: ' + slug
    assert '"@type":"Service"' in html and '"@type":"FAQPage"' in html, 'Missing schema: ' + slug
    assert_retention_popup(html, slug)
print('All nine new production landings, 54 comparisons and their SEO markup verified.')


# Inspect public SEO and delivery headers without submitting a valid application.
request = urllib.request.Request('https://artbalkon.site/?technical-check=1', headers={'Accept-Encoding': 'gzip'})
with urllib.request.urlopen(request, timeout=30) as response:
    body = response.read()
    html_encoding = response.headers.get('Content-Encoding', '')
    html_cache = response.headers.get('Cache-Control', '')
    if html_encoding == 'gzip':
        body = gzip.decompress(body)
    html = body.decode('utf-8')
assert '<meta name="robots" content="index,follow,max-image-preview:large">' in html, 'Production must remain indexable'
assert '<link rel="canonical" href="https://artbalkon.site/">' in html, 'Incorrect home canonical'
assert 'href="/nashi-raboty/"' in html, 'Portfolio must be crawlable from the home page'
assert_retention_popup(html, '/')
css_path = re.search(r'<link rel="stylesheet" href="([^"]+)"', html).group(1)
css_version = urllib.parse.parse_qs(urllib.parse.urlsplit(css_path).query).get('v', [''])[0]
assert re.fullmatch(r'[0-9a-f]{12}', css_version), 'Published stylesheet URL must contain its content hash'
css_request = urllib.request.Request('https://artbalkon.site' + css_path, headers={'Accept-Encoding': 'gzip'})
with urllib.request.urlopen(css_request, timeout=30) as response:
    css_bytes = response.read()
    css_encoding = response.headers.get('Content-Encoding', '')
    css_cache = response.headers.get('Cache-Control', '')
    css = gzip.decompress(css_bytes) if css_encoding == 'gzip' else css_bytes
assert hashlib.sha256(css).hexdigest()[:12] == css_version, 'Published stylesheet content does not match the version requested by HTML'
assert b'calculator-scene-ready' in css and b'100svh' in css, 'Published styles do not contain the latest responsive/performance fixes'
robots = urllib.request.urlopen('https://artbalkon.site/robots.txt?technical-check=1', timeout=30).read().decode('utf-8')
assert 'Sitemap: https://artbalkon.site/sitemap.xml' in robots, 'Production sitemap must remain discoverable'
sitemap = urllib.request.urlopen('https://artbalkon.site/sitemap.xml?technical-check=1', timeout=30).read().decode('utf-8')
assert len(re.findall(r'<loc>', sitemap)) == 24, 'Production sitemap must include 24 content pages'
print('Production SEO and static delivery:', json.dumps({'html_encoding': html_encoding, 'html_cache': html_cache, 'css_encoding': css_encoding, 'css_cache': css_cache, 'css_version': css_version, 'callback_inline_styles': True, 'css_transfer_bytes': len(css_bytes), 'css_decoded_bytes': len(css)}, ensure_ascii=False))
if css_encoding != 'gzip':
    print('NOTICE: the hosting front end did not apply gzip to CSS; inspect its static-file settings.')


# The designed error page must keep a real 404 response (never a soft 404).
try:
    opener.open('https://artbalkon.site/__artbalkon-audit-missing-20261015/', timeout=30)
    raise AssertionError('Missing URL was served without HTTP 404')
except urllib.error.HTTPError as error:
    assert error.code == 404, 'Missing URL must return HTTP 404'
    missing_html = error.read().decode('utf-8')
    assert 'Такой страницы нет' in missing_html, 'Production must use the generated error page'
    assert '<meta name="robots" content="noindex,follow">' in missing_html, '404 page must remain non-indexable'
print('Production custom HTTP 404 verified; error pages remain non-indexable.')

# Inspect the current main script just as strictly as the stylesheet.
js_path = re.search(r'<script defer src="([^"]*app\.js[^"]*)"', html).group(1)
js_version = urllib.parse.parse_qs(urllib.parse.urlsplit(js_path).query).get('v', [''])[0]
assert re.fullmatch(r'[0-9a-f]{12}', js_version), 'Published script must have a content hash'
js_request = urllib.request.Request('https://artbalkon.site' + js_path, headers={'Accept-Encoding': 'gzip'})
with urllib.request.urlopen(js_request, timeout=30) as response:
    js_bytes = response.read()
    js_encoding = response.headers.get('Content-Encoding', '')
    js_cache = response.headers.get('Cache-Control', '')
    js = gzip.decompress(js_bytes) if js_encoding == 'gzip' else js_bytes
assert hashlib.sha256(js).hexdigest()[:12] == js_version, 'Published script bytes do not match the URL hash'
print('Production script delivery:', json.dumps({'js_encoding': js_encoding, 'js_cache': js_cache, 'js_version': js_version, 'js_transfer_bytes': len(js_bytes), 'js_decoded_bytes': len(js)}, ensure_ascii=False))

# All duplicate URL variants must redirect directly to the canonical HTTPS URL.
origin = 'https://artbalkon.site'
query = '?utm_source=audit&probe=a%2Bb%2Fc'
landing = '/osteklenie-balkona-s-vynosom/'
redirect_variants = [
    ('http://artbalkon.site/', '/'),
    ('https://www.artbalkon.site/', '/'),
    ('http://www.artbalkon.site/', '/'),
    (origin + '/index.html', '/'),
    (origin + '/index.html' + query, '/' + query),
    (origin + landing + 'index.html' + query, landing + query),
    ('http://www.artbalkon.site' + landing + 'index.html' + query, landing + query),
    ('https://www.artbalkon.site' + landing + query, landing + query),
]
variants = []
for variant, target in redirect_variants:
    try:
        with opener.open(variant, timeout=30) as response:
            raise AssertionError('Duplicate URL must redirect with HTTP 301: ' + variant)
    except urllib.error.HTTPError as error:
        assert error.code == 301, 'Duplicate URL must return HTTP 301: ' + variant
        assert error.headers['Location'] == origin + target, 'Incorrect canonical redirect or lost query: ' + variant
        variants.append({'url': variant, 'status': error.code, 'location': error.headers['Location']})
print('Production canonical redirects:', json.dumps(variants, ensure_ascii=False))

# Canonical destinations must work immediately, without DirectoryIndex redirect loops.
for target in sorted({'/', landing, *(target for _, target in redirect_variants)}):
    with opener.open(origin + target, timeout=30) as response:
        assert response.status == 200, 'Canonical destination must return HTTP 200: ' + target
        assert not response.headers.get('Location'), 'Canonical destination must not redirect: ' + target
print('Production canonical destinations verified: HTTP 200, query strings preserved, no redirect loops.')

# A direct API GET must stay JSON/405; never render or redirect to a public page.
try:
    opener.open(origin + '/api/leads.php', timeout=30)
    raise AssertionError('API must reject GET')
except urllib.error.HTTPError as error:
    assert error.code == 405, 'API GET must return HTTP 405'
    assert error.headers.get('Allow') == 'POST', 'API must advertise POST'
    assert 'application/json' in error.headers.get('Content-Type', ''), 'API error must stay JSON'
    assert not error.headers.get('Location'), 'API error must not redirect'
    assert json.load(error).get('ok') is False, 'API error must return ok:false'
print('Production API method response verified; no email sent.')
