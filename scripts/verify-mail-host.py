"""Check deployed redirects, PHP and form configuration without sending any application."""
import json
import urllib.request
import urllib.error


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, newurl):
        return None


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
    assert 'Визуализации проектов' in html, 'Missing visualization disclosure: ' + slug
    assert '"@type":"Service"' in html and '"@type":"FAQPage"' in html, 'Missing schema: ' + slug
print('All nine new production landings, 54 comparisons and their SEO markup verified.')
