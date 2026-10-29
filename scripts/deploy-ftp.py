"""Publish dist with atomic file replacement; never delete unrelated remote files."""
import argparse
import ftplib
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import ssl
import sys
import time
import uuid

STATE = '.artbalkon-deploy-state.json'
SAM_STATE = '.ftp-deploy-sync-state.json'
NETWORK_ERRORS = (OSError, EOFError, ftplib.error_temp)


def safe_path(name):
    if not isinstance(name, str) or not name or any(c in name for c in '\\\r\n\0'):
        raise ValueError('Invalid deployment path')
    path = PurePosixPath(name)
    if path.is_absolute() or '..' in path.parts or str(path) != name or name == '.':
        raise ValueError('Deployment path must stay inside its root')
    return name


def record_valid(value):
    return (isinstance(value, dict) and isinstance(value.get('sha256'), str)
            and re.fullmatch(r'[a-f0-9]{64}', value['sha256']) is not None
            and type(value.get('size')) is int and value['size'] >= 0)


class Deployer:
    def __init__(self, connect, remote_dir='.', attempts=4, checkpoint=20,
                 sleep=time.sleep, log=print):
        if not 1 <= attempts <= 4 or checkpoint < 1:
            raise ValueError('Invalid deployment retry or checkpoint setting')
        remote_dir = remote_dir.rstrip('/') or '/'
        if remote_dir not in ('.', '/'):
            safe_path(remote_dir.lstrip('/'))
        self.connect, self.remote_dir = connect, remote_dir
        self.attempts, self.checkpoint, self.sleep, self.log = attempts, checkpoint, sleep, log
        self.ftp, self.root, self.directories = None, None, set()
        self.state, self.bootstrap = {}, False

    def close(self):
        if self.ftp is not None:
            try:
                self.ftp.close()
            except OSError:
                pass
        self.ftp = None
        self.directories.clear()

    def retry(self, operation, label):
        for attempt in range(self.attempts):
            try:
                if self.ftp is None:
                    self.ftp = self.connect()
                    self.ftp.cwd(self.remote_dir)
                    self.root = self.ftp.pwd()
                    self.ftp.voidcmd('TYPE I')
                return operation(self.ftp)
            except NETWORK_ERRORS:
                self.close()
                if attempt + 1 == self.attempts:
                    raise RuntimeError('FTP operation failed after bounded retries: ' + label) from None
                self.log('FTP reconnect {}/{}: {}'.format(attempt + 1, self.attempts, label))
                self.sleep(min(2 ** attempt, 4))

    def read_json(self, name):
        safe_path(name)

        def receive(ftp):
            data = bytearray()

            def append(chunk):
                data.extend(chunk)
                if len(data) > 8 * 1024 * 1024:
                    raise ValueError('Deployment state is too large')
            try:
                ftp.retrbinary('RETR ' + name, append)
            except ftplib.error_perm as error:
                if str(error).startswith('550'):
                    return None
                raise
            try:
                return json.loads(data)
            except (ValueError, UnicodeError):
                return None
        return self.retry(receive, 'read deployment state')

    def load_state(self):
        own = self.read_json(STATE)
        if isinstance(own, dict) and own.get('version') == 1 and isinstance(own.get('files'), dict):
            candidates = own['files'].items()
        else:
            sam = self.read_json(SAM_STATE)
            self.bootstrap = True
            candidates = ((entry.get('name'), {'sha256': entry.get('hash'), 'size': entry.get('size')})
                          for entry in sam.get('data', []) if isinstance(entry, dict) and entry.get('type') == 'file') \
                if isinstance(sam, dict) and sam.get('version') == '1.0.0' and isinstance(sam.get('data'), list) else []
        for name, value in candidates:
            try:
                safe_path(name)
            except ValueError:
                continue
            if record_valid(value):
                self.state[name] = value

    def ensure_directories(self, ftp, name):
        parent = PurePosixPath(name).parent
        for index in range(1, len(parent.parts) + 1):
            directory = '/'.join(parent.parts[:index])
            if directory in self.directories:
                continue
            try:
                ftp.mkd(directory)
            except ftplib.error_perm as error:
                if not str(error).startswith('550'):
                    raise
                ftp.cwd(directory)  # Distinguish an existing directory from a failed mkdir.
                ftp.cwd(self.root)
            self.directories.add(directory)

    def remote_size(self, name):
        def inspect(ftp):
            try:
                return ftp.size(name)
            except ftplib.error_perm as error:
                if str(error).startswith('550'):
                    return None
                raise
        return self.retry(inspect, 'inspect ' + name)

    def atomic_upload(self, name, open_file, size):
        safe_path(name)
        target = PurePosixPath(name)
        temporary = str(target.with_name('.artbalkon-upload-' + uuid.uuid4().hex + '-' + target.name))

        def transfer(ftp):
            self.ensure_directories(ftp, name)
            try:
                with open_file() as source:
                    ftp.storbinary('STOR ' + temporary, source, blocksize=64 * 1024)
                if ftp.size(temporary) != size:
                    raise OSError('Incomplete FTP temporary upload')
                ftp.rename(temporary, name)  # Never delete the final file to work around RNTO errors.
            finally:
                try:
                    ftp.delete(temporary)  # Only the unique temporary file owned by this operation.
                except Exception:
                    pass
        self.retry(transfer, 'upload ' + name)

    def save_state(self):
        data = json.dumps({'version': 1, 'files': self.state}, sort_keys=True,
                          separators=(',', ':')).encode('utf-8')
        self.atomic_upload(STATE, lambda: io.BytesIO(data), len(data))

    def deploy(self, local_dir):
        local = Path(local_dir).resolve(strict=True)
        if not local.is_dir():
            raise ValueError('Local deployment directory is missing')
        files = []
        for file in sorted(local.rglob('*')):
            if file.is_symlink():
                raise ValueError('Deployment symlinks are not allowed')
            if not file.is_file():
                continue
            name = safe_path(file.relative_to(local).as_posix())
            if name in (STATE, SAM_STATE) or '.artbalkon-upload-' in file.name:
                raise ValueError('Reserved deployment filename')
            with file.open('rb') as source:
                digest = hashlib.file_digest(source, 'sha256').hexdigest()
            files.append((name, file, {'sha256': digest, 'size': file.stat().st_size}))
        uploaded = skipped = 0
        try:
            self.load_state()
            for name, file, value in files:
                critical = name.endswith(('.html', '.php')) or name in ('.htaccess', 'robots.txt', 'sitemap.xml', 'site-config.json')
                unchanged = self.state.get(name) == value and not (self.bootstrap and critical)
                if unchanged and self.remote_size(name) == value['size']:
                    skipped += 1
                    continue
                self.atomic_upload(name, lambda file=file: file.open('rb'), value['size'])
                self.state[name] = value
                uploaded += 1
                self.log('Published: ' + name)
                if uploaded % self.checkpoint == 0:
                    self.save_state()
            self.save_state()
        except Exception:
            try:
                self.save_state()
            except Exception:
                pass  # The last valid remote checkpoint remains intact.
            raise
        finally:
            self.close()
        return {'uploaded': uploaded, 'skipped': skipped}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--local-dir', default='dist')
    parser.add_argument('--remote-dir', default='.')
    args = parser.parse_args()
    host, user, password = (os.environ.get('FTP_' + key, '') for key in ('HOST', 'USER', 'PASSWORD'))
    if not all((host, user, password)):
        raise ValueError('FTP_HOST, FTP_USER and FTP_PASSWORD must be configured')
    tls = os.environ.get('FTP_TLS', 'false').lower() == 'true'

    def connect():
        ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=120) if tls else ftplib.FTP(timeout=120)
        try:
            ftp.connect(host, int(os.environ.get('FTP_PORT', '21')))
            ftp.login(user, password)
            if tls:
                ftp.prot_p()
            return ftp
        except Exception:
            ftp.close()
            raise
    result = Deployer(connect).deploy(args.local_dir)
    print('FTP deployment complete: {uploaded} uploaded, {skipped} unchanged.'.format(**result))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('FTP deployment failed (' + type(error).__name__ + '); published files are preserved.', file=sys.stderr)
        sys.exit(1)
