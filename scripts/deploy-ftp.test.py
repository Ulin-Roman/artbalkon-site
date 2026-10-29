"""Offline regression tests for the atomic FTP publisher; no network or credentials."""
import ftplib
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import tempfile
import unittest
import sys

sys.dont_write_bytecode = True
SPEC = importlib.util.spec_from_file_location('deploy_ftp', Path(__file__).with_name('deploy-ftp.py'))
deploy = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(deploy)


class FakeServer:
    def __init__(self, files=None):
        self.files = dict(files or {})
        self.directories = {''}
        for name in self.files:
            self.directories.update(str(parent) for parent in PurePosixPath(name).parents if str(parent) != '.')
        self.connections = 0
        self.stores, self.deletes, self.renames, self.published_before_retry = [], [], [], []
        self.partial_error = self.short_upload = self.lost_rename_ack = self.reject_overwrite = False
        self.always_fail = False

    def connect(self):
        self.connections += 1
        return FakeFTP(self)


class FakeFTP:
    def __init__(self, server):
        self.server, self.directory, self.closed = server, '', False

    def path(self, name):
        return (self.directory + '/' + name).lstrip('/') if self.directory else name.lstrip('/')

    def cwd(self, directory):
        target = '' if directory in ('.', '/') else self.path(directory)
        if target not in self.server.directories:
            raise ftplib.error_perm('550 Missing directory')
        self.directory = target

    def pwd(self):
        return '/' + self.directory

    def voidcmd(self, command):
        assert command == 'TYPE I'

    def close(self):
        self.closed = True

    def mkd(self, directory):
        target = self.path(directory)
        if target in self.server.directories:
            raise ftplib.error_perm('550 Already exists')
        self.server.directories.add(target)

    def retrbinary(self, command, callback):
        name = self.path(command.removeprefix('RETR '))
        if name not in self.server.files:
            raise ftplib.error_perm('550 Missing file')
        callback(self.server.files[name])

    def size(self, name):
        if self.path(name) not in self.server.files:
            raise ftplib.error_perm('550 Missing file')
        return len(self.server.files[self.path(name)])

    def storbinary(self, command, source, blocksize=8192):
        name, data = self.path(command.removeprefix('STOR ')), source.read()
        self.server.stores.append(name)
        if (self.server.partial_error or self.server.always_fail) and not name.endswith('-' + deploy.STATE):
            self.server.partial_error = False
            self.server.files[name] = data[:max(1, len(data) // 2)]
            self.server.published_before_retry.append(dict(self.server.files))
            raise TimeoutError('control timeout; secret-password must not be logged')
        if self.server.short_upload and not name.endswith('-' + deploy.STATE):
            self.server.short_upload = False
            self.server.files[name] = data[:1]
        else:
            self.server.files[name] = data

    def rename(self, source, target):
        source, target = self.path(source), self.path(target)
        if self.server.reject_overwrite and target in self.server.files:
            raise ftplib.error_perm('550 RNTO overwrite refused')
        self.server.renames.append((source, target))
        self.server.files[target] = self.server.files.pop(source)
        if self.server.lost_rename_ack and target != deploy.STATE:
            self.server.lost_rename_ack = False
            raise EOFError('rename completed but acknowledgement lost')

    def delete(self, name):
        name = self.path(name)
        self.server.deletes.append(name)
        if name not in self.server.files:
            raise ftplib.error_perm('550 Missing file')
        del self.server.files[name]


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp_root = Path(__file__).resolve().parent.parent / 'work' / 'ftp-deploy-tests'
        self.temp_root.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=self.temp_root)
        self.local = Path(self.temp.name).resolve()
        self.logs = []

    def tearDown(self):
        self.local.relative_to(self.temp_root.resolve())
        self.temp.cleanup()

    def put(self, name, data):
        file = self.local / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(data)

    def run_deploy(self, server, **options):
        return deploy.Deployer(server.connect, sleep=lambda _: None, log=self.logs.append,
                               **options).deploy(self.local)

    def test_first_setup_preserves_unmanaged_files_and_php_suffix(self):
        self.put('index.html', b'<h1>New page</h1>')
        self.put('api/leads.php', b'<?php echo "ok";')
        server = FakeServer({'uploads/customer.jpg': b'original', '.user.ini': b'keep'})
        result = self.run_deploy(server)
        self.assertEqual(result, {'uploaded': 2, 'skipped': 0})
        self.assertEqual(server.files['uploads/customer.jpg'], b'original')
        self.assertEqual(server.files['.user.ini'], b'keep')
        self.assertTrue(any(name.endswith('-leads.php') for name in server.stores))
        self.assertFalse(any(name in ('index.html', 'api/leads.php') for name in server.deletes))
        state = json.loads(server.files[deploy.STATE])
        self.assertEqual(state['files']['api/leads.php']['sha256'], hashlib.sha256(b'<?php echo "ok";').hexdigest())

    def test_partial_transfer_reconnects_without_truncating_live_file(self):
        self.put('index.html', b'new-complete-page')
        server = FakeServer({'index.html': b'old-live-page'})
        server.partial_error = True
        self.run_deploy(server)
        self.assertGreaterEqual(server.connections, 2)
        self.assertEqual(server.published_before_retry[0]['index.html'], b'old-live-page')
        self.assertEqual(server.files['index.html'], b'new-complete-page')
        self.assertNotIn('secret-password', '\n'.join(self.logs))

    def test_short_upload_is_not_renamed_until_size_matches(self):
        self.put('index.html', b'complete-page')
        server = FakeServer({'index.html': b'old'})
        server.short_upload = True
        self.run_deploy(server)
        self.assertEqual(server.files['index.html'], b'complete-page')
        self.assertEqual(sum(target == 'index.html' for _, target in server.renames), 1)
        self.assertGreaterEqual(server.connections, 2)

    def test_exhausted_retries_raise_and_preserve_live_file(self):
        self.put('index.html', b'new-complete-page')
        server = FakeServer({'index.html': b'old-live-page'})
        server.always_fail = True
        with self.assertRaisesRegex(RuntimeError, 'failed after bounded retries'):
            self.run_deploy(server)
        attempts = [name for name in server.stores if name.endswith('-index.html')]
        self.assertEqual(len(attempts), 4)
        self.assertEqual(len(self.logs), 3)
        self.assertEqual(server.files['index.html'], b'old-live-page')
        self.assertTrue(all(snapshot['index.html'] == b'old-live-page'
                            for snapshot in server.published_before_retry))
        self.assertFalse(any(target == 'index.html' for _, target in server.renames))
        self.assertNotIn('index.html', server.deletes)
        self.assertNotIn('secret-password', '\n'.join(self.logs))

    def test_lost_rename_ack_is_safe_to_retry(self):
        self.put('index.html', b'complete-page')
        server = FakeServer({'index.html': b'old'})
        server.lost_rename_ack = True
        self.run_deploy(server)
        self.assertEqual(server.files['index.html'], b'complete-page')
        self.assertEqual(sum(target == 'index.html' for _, target in server.renames), 2)

    def test_unchanged_uses_hash_and_size_not_size_alone(self):
        self.put('asset.webp', b'new-image')
        server = FakeServer()
        self.run_deploy(server)
        server.stores.clear()
        self.assertEqual(self.run_deploy(server), {'uploaded': 0, 'skipped': 1})
        self.assertFalse(any(name.endswith('-asset.webp') for name in server.stores))
        self.put('asset.webp', b'other-img')  # Same size, different bytes.
        self.assertEqual(self.run_deploy(server), {'uploaded': 1, 'skipped': 0})
        self.assertEqual(server.files['asset.webp'], b'other-img')
        server.files['asset.webp'] = b''  # A stale state must not hide an empty remote file.
        self.assertEqual(self.run_deploy(server), {'uploaded': 1, 'skipped': 0})

    def test_sam_bootstrap_republishes_html_and_reuses_verified_binary(self):
        self.put('index.html', b'correct-html')
        self.put('asset.webp', b'photo')
        entries = [{'type': 'file', 'name': name, 'size': len(data), 'hash': hashlib.sha256(data).hexdigest()}
                   for name, data in [('index.html', b'correct-html'), ('asset.webp', b'photo')]]
        entries += [{'type': 'file', 'name': '../outside', 'size': 1, 'hash': 'a' * 64}]
        server = FakeServer({'index.html': b'', 'asset.webp': b'photo',
                             deploy.SAM_STATE: json.dumps({'version': '1.0.0', 'data': entries}).encode()})
        self.assertEqual(self.run_deploy(server), {'uploaded': 1, 'skipped': 1})
        self.assertEqual(server.files['index.html'], b'correct-html')
        self.assertNotIn('../outside', json.loads(server.files[deploy.STATE])['files'])

    def test_rename_refusal_keeps_final_and_only_cleans_own_temp(self):
        self.put('index.html', b'new')
        server = FakeServer({'index.html': b'old'})
        server.reject_overwrite = True
        with self.assertRaises(ftplib.error_perm):
            self.run_deploy(server)
        self.assertEqual(server.files['index.html'], b'old')
        self.assertTrue(server.deletes)
        self.assertTrue(all('.artbalkon-upload-' in name for name in server.deletes))

    def test_security_paths_and_symlinks(self):
        for path in ['../outside', '/absolute', 'a/../b', 'a\\b', 'x\r\nDELE secret', './x', 'a//b', '.']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                deploy.safe_path(path)
        with self.assertRaises(ValueError):
            deploy.Deployer(FakeServer().connect, remote_dir='../outside')
        outside = self.local.parent / (self.local.name + '-outside')
        outside.write_bytes(b'private')
        try:
            try:
                (self.local / 'linked').symlink_to(outside)
            except OSError:
                self.skipTest('Symlinks are unavailable on this host')
            with self.assertRaises(ValueError):
                self.run_deploy(FakeServer())
        finally:
            outside.unlink()


if __name__ == '__main__':
    unittest.main()
