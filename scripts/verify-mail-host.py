"""Check deployed redirects, PHP and form configuration without sending any application."""
import json
import gzip
import hashlib
import re
import urllib.request
import urllib.error
import urllib.parse
import urllib.robotparser
from html.parser import HTMLParser
from pathlib import Path


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        return None


class FaviconLinks(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.links = []
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if tag == 'link' and set((attributes.get('rel') or '').split()) & {'icon', 'apple-touch-icon'}:
            self.links.append(attributes)


def seo_snapshot(html, page):
    """Compare the deployed search metadata with the validated build."""
    values = {}
    patterns = {
        'title': r'<title>([\s\S]*?)</title>',
        'description': r'<meta name="description" content="([^"]*)"',
        'h1': r'<h1\b[^>]*>([\s\S]*?)</h1>',
        'canonical': r'<link rel="canonical" href="([^"]*)"',
        'robots': r'<meta name="robots" content="([^"]*)"',
        'og:title': r'<meta property="og:title" content="([^"]*)"',
        'og:description': r'<meta property="og:description" content="([^"]*)"',
        'og:url': r'<meta property="og:url" content="([^"]*)"',
        'og:image': r'<meta property="og:image" content="([^"]*)"',
        'json-ld': r'<script type="application/ld\+json">([\s\S]*?)</script>',
    }
    for name, pattern in patterns.items():
        matches = re.findall(pattern, html, re.I)
        assert len(matches) == 1 and matches[0].strip(), 'Missing, empty or repeated ' + name + ': ' + page
        values[name] = json.loads(matches[0]) if name == 'json-ld' else matches[0]
    return values


production_pages = {}


retired_portfolio_paths = [
    '/nashi-raboty/',
    '/nashi-raboty/lodzhiya-v-golubom/',
    '/nashi-raboty/lodzhiya-na-anohina/',
    '/nashi-raboty/lodzhiya-v-himkah/',
]


def assert_no_retired_portfolio_links(html, page):
    for href in re.findall(r'<a\b[^>]*\bhref=[\"\']([^\"\']+)[\"\']', html, re.I):
        url = urllib.parse.urlsplit(urllib.parse.urljoin('https://artbalkon.site' + page, href))
        if url.hostname not in ['artbalkon.site', 'www.artbalkon.site']:
            continue
        path = re.sub(r'/index\.html$', '/', url.path).rstrip('/') + '/'
        assert path not in retired_portfolio_paths, 'Link to a retired portfolio page: ' + page + ' -> ' + href



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
    ('mebel-dlya-balkona/?probe=a%2Bb', '/?probe=a%2Bb#complex-options'),
    ('krysha-nad-balkonom/', '/#complex-options'),
    ('elektrika-na-balkone/', '/#complex-options'),
    ('osteklenie-lodzhii/', '/osteklenie-balkonov/'),
    ('uteplenie-lodzhii/', '/uteplenie-balkonov/'),
    ('otdelka-lodzhii/', '/otdelka-balkonov/'),
    ('holodnoe-osteklenie-lodzhii/', '/holodnoe-osteklenie/'),
    ('teploe-osteklenie-lodzhii/', '/teploe-osteklenie/'),
    ('panoramnoe-osteklenie-lodzhii/', '/panoramnoe-osteklenie/'),
    *[(variant.lstrip('/'), '/#before-after')
      for path in retired_portfolio_paths
      for variant in [path.rstrip('/'), path, path + 'index.html']],
    ('nashi-raboty/lodzhiya-v-golubom/?probe=a%2Bb', '/?probe=a%2Bb#before-after'),
]:
    try:
        opener.open('https://artbalkon.site/' + old_path, timeout=30)
        raise AssertionError('Moved URL was served without a permanent redirect: ' + old_path)
    except urllib.error.HTTPError as error:
        assert error.code == 301, 'Moved URL must return HTTP 301: ' + old_path
        assert error.headers['Location'] == 'https://artbalkon.site' + target, 'Incorrect redirect destination: ' + old_path + ' -> ' + str(error.headers.get('Location'))
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
    production_pages[url] = html
    assert 'rel="canonical" href="' + url + '"' in html, 'Incorrect canonical: ' + slug
    assert html.count('data-comparison ') == 6, 'Expected six works: ' + slug
    gallery_heading = re.search(r'id="before-after"[\s\S]*?<h2\b[^>]*>([\s\S]*?)</h2>', html)
    assert gallery_heading and re.sub(r'<[^>]*>', '', gallery_heading.group(1)).strip(), 'Missing project gallery heading: ' + slug
    assert 'визуализац' not in html.lower(), 'Customer-facing copy and metadata must remain neutral: ' + slug
    assert '"@type":"Service"' in html and '"@type":"FAQPage"' in html, 'Missing schema: ' + slug
    assert_no_retired_portfolio_links(html, '/' + slug + '/')
    assert_retention_popup(html, slug)
print('All nine new production landings, 54 comparisons and their SEO markup verified.')

finishing_url = 'https://artbalkon.site/otdelka-balkonov/'
finishing_html = urllib.request.urlopen(finishing_url, timeout=30).read().decode('utf-8')
production_pages[finishing_url] = finishing_html
assert 'thermal-section' not in finishing_html, 'Finishing page still contains the thermal inspection block'
for block_id in ['finishing-styles', 'finishing-calculator', 'finishing-calc-modal', 'quiz']:
    assert finishing_html.count('id="' + block_id + '"') == 1, 'Missing or repeated finishing block: ' + block_id
assert 'CALCULATOR_CONTACT_FIELDS' not in finishing_html, 'Finishing calculator contact fields were not rendered'
print('Production finishing page verified: styles and calculator present, thermal inspection omitted.')


# Inspect public SEO and delivery headers without submitting a valid application.
request = urllib.request.Request('https://artbalkon.site/?technical-check=1', headers={'Accept-Encoding': 'gzip'})
with urllib.request.urlopen(request, timeout=30) as response:
    body = response.read()
    html_encoding = response.headers.get('Content-Encoding', '')
    html_cache = response.headers.get('Cache-Control', '')
    if html_encoding == 'gzip':
        body = gzip.decompress(body)
    html = body.decode('utf-8')
production_pages['https://artbalkon.site/'] = html
assert '<meta name="robots" content="index,follow,max-image-preview:large">' in html, 'Production must remain indexable'
assert '<link rel="canonical" href="https://artbalkon.site/">' in html, 'Incorrect home canonical'
gift_image = re.search(r'<img\b[^>]*\bclass="gift-3d-fallback"[^>]*>', html)
assert gift_image, 'Missing decorative gift image'
for attribute in ['alt=""', 'aria-hidden="true"', 'role="presentation"']:
    assert attribute in gift_image.group(0), 'Incorrect decorative gift markup: ' + attribute
assert 'Объёмный подарок с золотистым бантом' not in html, 'Decorative gift description must not leak into the indexed page text'
assert re.search(r'href=[\"\']/?#before-after[\"\']', html), 'Portfolio must be reachable from the home page'
assert 'id="before-after"' in html, 'Home portfolio destination must exist'
assert_no_retired_portfolio_links(html, '/')
assert_retention_popup(html, '/')
social_pattern = r'<section\b[^>]*\bid="social-subscribe"[\s\S]*?</section>'
social_section = re.search(social_pattern, html)
expected_social_section = re.search(social_pattern, Path('dist/index.html').read_text(encoding='utf-8'))
assert social_section and expected_social_section and social_section.group(0) == expected_social_section.group(0), 'Published social cards differ from the checked build'
print('Production social section verified: markup matches the checked build.')
telegram_preview_pattern = r'<article class="social-photo-card social-photo-card--telegram">[\s\S]*?<div class="social-photo-preview[^"]*"[^>]*>([\s\S]*?)</div>'
telegram_preview = re.search(telegram_preview_pattern, html)
expected_telegram_preview = re.search(telegram_preview_pattern, Path('dist/index.html').read_text(encoding='utf-8'))
assert telegram_preview and expected_telegram_preview and telegram_preview.group(1) == expected_telegram_preview.group(1), 'Published Telegram photos differ from the checked build'
telegram_photos = re.findall(r'<img\b[^>]*\bsrc="([^"]+)"', telegram_preview.group(1))
assert len(telegram_photos) == 3, 'Telegram card must show three photos'
for photo_path in telegram_photos:
    photo_bytes = urllib.request.urlopen('https://artbalkon.site' + photo_path, timeout=30).read()
    assert photo_bytes == Path('dist' + photo_path).read_bytes(), 'Published Telegram photo differs from the checked build: ' + photo_path
print('Production Telegram gallery verified: three matching photos.')
vk_preview_pattern = r'<article class="social-photo-card social-photo-card--vk">[\s\S]*?<div class="social-photo-preview[^"]*"[^>]*>([\s\S]*?)</div>'
vk_preview = re.search(vk_preview_pattern, html)
expected_vk_preview = re.search(vk_preview_pattern, Path('dist/index.html').read_text(encoding='utf-8'))
assert vk_preview and expected_vk_preview and vk_preview.group(1) == expected_vk_preview.group(1), 'Published VK photos differ from the checked build'
vk_photos = re.findall(r'<img\b[^>]*\bsrc="([^"]+)"', vk_preview.group(1))
assert len(vk_photos) == 3, 'VK card must show three photos'
for photo_path in vk_photos:
    photo_bytes = urllib.request.urlopen('https://artbalkon.site' + photo_path, timeout=30).read()
    assert photo_bytes == Path('dist' + photo_path).read_bytes(), 'Published VK photo differs from the checked build: ' + photo_path
print('Production VK gallery verified: three matching photos.')
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
assert css == Path('dist/styles.css').read_bytes(), 'Published stylesheet differs from the checked build'
assert b'calculator-scene-ready' in css and b'100svh' in css, 'Published styles do not contain the latest responsive/performance fixes'
robots = urllib.request.urlopen('https://artbalkon.site/robots.txt?technical-check=1', timeout=30).read().decode('utf-8')
assert 'Sitemap: https://artbalkon.site/sitemap.xml' in robots, 'Production sitemap must remain discoverable'

# Search robots may select any advertised icon, so verify every current format.
favicon_types = {
    '/favicon.svg': {'image/svg+xml'},
    '/favicon.ico': {'image/x-icon', 'image/vnd.microsoft.icon'},
    '/favicon.png': {'image/png'},
    '/apple-touch-icon.png': {'image/png'},
}
favicon_urls = None
for label, page_html in [('home', html), ('finishing', finishing_html)]:
    links = FaviconLinks(page_html).links
    icons = {}
    for attributes in links:
        href = attributes.get('href')
        assert href, 'Favicon needs a URL: ' + label
        url = urllib.parse.urljoin('https://artbalkon.site/', href)
        parsed = urllib.parse.urlsplit(url)
        assert parsed.scheme == 'https' and parsed.netloc == 'artbalkon.site', 'Favicon must use the production origin: ' + url
        assert parsed.path in favicon_types, 'Unexpected favicon link: ' + url
        if attributes.get('type'):
            assert attributes['type'] in favicon_types[parsed.path], 'Incorrect favicon link type: ' + url
        assert parsed.path not in icons, 'Repeated favicon link: ' + label + ' ' + parsed.path
        icons[parsed.path] = url
    assert set(icons) == set(favicon_types), 'Missing favicon formats: ' + label
    if favicon_urls is None:
        favicon_urls = icons
    else:
        assert icons == favicon_urls, 'Home and internal page must advertise the same favicons'
robot_rules = urllib.robotparser.RobotFileParser()
robot_rules.parse(robots.splitlines())
favicon_results = []
for asset, url in favicon_urls.items():
    for user_agent in ['YandexBot', 'YandexFavicons', 'YandexImages', '*']:
        assert robot_rules.can_fetch(user_agent, url), 'robots.txt blocks favicon for ' + user_agent + ': ' + asset
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)'})
    with opener.open(request, timeout=30) as response:
        assert response.status == 200 and not response.headers.get('Location'), 'Favicon must return HTTP 200 directly: ' + asset
        content_type = response.headers.get_content_type()
        assert content_type in favicon_types[asset], 'Incorrect favicon Content-Type: ' + asset + ' ' + content_type
        icon = response.read()
    assert icon == Path('dist' + asset).read_bytes(), 'Published favicon differs from the checked build: ' + asset
    favicon_results.append({'path': asset, 'type': content_type, 'bytes': len(icon)})
print('Production favicons verified on home and finishing page:', json.dumps(favicon_results))

sitemap = urllib.request.urlopen('https://artbalkon.site/sitemap.xml?technical-check=1', timeout=30).read().decode('utf-8')
content_urls = re.findall(r'<loc>([^<]+)</loc>', sitemap)
assert len(content_urls) == 20, 'Production sitemap must include 20 content pages'
expected_urls = re.findall(r'<loc>([^<]+)</loc>', Path('dist/sitemap.xml').read_text(encoding='utf-8'))
assert set(content_urls) == set(expected_urls), 'Published sitemap differs from the checked build'
seen_titles, seen_descriptions = set(), set()
for url in content_urls:
    assert url.startswith('https://artbalkon.site/'), 'Unexpected sitemap origin: ' + url
    path = urllib.parse.urlsplit(url).path
    assert path not in retired_portfolio_paths, 'Retired portfolio page must not appear in the sitemap: ' + url
    page_html = production_pages.get(url)
    if page_html is None:
        with opener.open(url, timeout=30) as response:
            assert response.status == 200, 'Content page must return HTTP 200: ' + url
            page_html = response.read().decode('utf-8')
    assert_no_retired_portfolio_links(page_html, path)
    actual = seo_snapshot(page_html, url)
    expected_html = Path('dist' + path + 'index.html').read_text(encoding='utf-8')
    assert actual == seo_snapshot(expected_html, url), 'Published SEO metadata differs from the checked build: ' + url
    assert actual['canonical'] == actual['og:url'] == url, 'Incorrect canonical or Open Graph URL: ' + url
    assert actual['robots'] == 'index,follow,max-image-preview:large', 'Content page must remain indexable: ' + url
    assert actual['title'] not in seen_titles, 'Repeated production title: ' + url
    assert actual['description'] not in seen_descriptions, 'Repeated production description: ' + url
    seen_titles.add(actual['title'])
    seen_descriptions.add(actual['description'])
print('Production SEO verified: 20 unique titles and descriptions; H1, canonical, Open Graph and JSON-LD match the checked build.')
for path in ['/privacy/', '/consent/']:
    with opener.open('https://artbalkon.site' + path, timeout=30) as response:
        actual = seo_snapshot(response.read().decode('utf-8'), path)
    expected = seo_snapshot(Path('dist' + path + 'index.html').read_text(encoding='utf-8'), path)
    assert actual == expected, 'Published legal metadata differs from the checked build: ' + path
    assert actual['robots'] == 'noindex,follow', 'Legal pages must remain non-indexable: ' + path
print('Production legal page descriptions verified; privacy and consent remain non-indexable.')
for photo in ['hero.webp', 'hero-320.webp', 'hero-640.webp']:
    asset = '/assets/cold-hero-sill-v2/' + photo
    with opener.open('https://artbalkon.site' + asset, timeout=30) as response:
        assert response.headers.get_content_type() == 'image/webp', 'Incorrect cold glazing hero Content-Type: ' + asset
        assert response.read() == Path('dist' + asset).read_bytes(), 'Published cold glazing hero differs from the checked build: ' + asset
print('Production corrected cold glazing hero verified: three matching WebP sizes.')
print('Production SEO and static delivery:', json.dumps({'html_encoding': html_encoding, 'html_cache': html_cache, 'css_encoding': css_encoding, 'css_cache': css_cache, 'css_version': css_version, 'callback_inline_styles': True, 'css_transfer_bytes': len(css_bytes), 'css_decoded_bytes': len(css)}, ensure_ascii=False))
if css_encoding != 'gzip':
    print('NOTICE: the hosting front end did not apply gzip to CSS; inspect its static-file settings.')


# The designed error page must keep a real 404 response (never a soft 404).
try:
    opener.open('https://artbalkon.site/__artbalkon-audit-missing-20261015/', timeout=30)
    raise AssertionError('Missing URL was served without HTTP 404')
except urllib.error.HTTPError as error:
    assert error.code == 404, 'Missing URL must return HTTP 404'
    assert not error.headers.get('Location'), 'Missing URL must not redirect'
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
assert js == Path('dist/app.js').read_bytes(), 'Published script differs from the checked build'
print('Production script delivery:', json.dumps({'js_encoding': js_encoding, 'js_cache': js_cache, 'js_version': js_version, 'js_transfer_bytes': len(js_bytes), 'js_decoded_bytes': len(js)}, ensure_ascii=False))

# The optional drawing code must be available with exactly the bytes just built.
scene_version = re.search(rb'calculator-scene\.js\?v=([0-9a-f]{12})', js)
assert scene_version, 'Main script must reference the versioned calculator module'
scene_url = 'https://artbalkon.site/calculator-scene.js?v=' + scene_version.group(1).decode('ascii')
with urllib.request.urlopen(urllib.request.Request(scene_url, headers={'Accept-Encoding': 'gzip'}), timeout=30) as response:
    scene_bytes = response.read()
    scene = gzip.decompress(scene_bytes) if response.headers.get('Content-Encoding') == 'gzip' else scene_bytes
assert scene == Path('dist/calculator-scene.js').read_bytes(), 'Published calculator module differs from the checked build'
assert b'createCalculatorScene' in scene, 'Calculator module must retain its public export'
print('Production lazy calculator module verified:', json.dumps({'bytes': len(scene), 'transfer_bytes': len(scene_bytes)}))

# Check the About clip and its matching poster after the hosting upload.
ambient = re.search(r'<video\b(?=[^>]*\bdata-ambient-video\b)[^>]*>', html)
assert ambient, 'Home About video must remain available'
ambient_assets = []
for attribute in ['data-src', 'poster']:
    asset = re.search(r'\b' + attribute + r'="([^"]+)"', ambient.group(0)).group(1)
    assert asset.startswith('/assets/video/'), 'About media must use a local video asset'
    with urllib.request.urlopen('https://artbalkon.site' + asset, timeout=30) as response:
        media = response.read()
    assert media == Path('dist' + asset).read_bytes(), 'Published About media differs from the checked build: ' + asset
    ambient_assets.append({'path': asset, 'bytes': len(media)})
print('Production About video and poster verified:', json.dumps(ambient_assets))

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
