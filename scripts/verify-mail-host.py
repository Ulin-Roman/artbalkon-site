"""Check deployed PHP and form configuration without sending any application."""
import json
import urllib.request
import urllib.error
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
