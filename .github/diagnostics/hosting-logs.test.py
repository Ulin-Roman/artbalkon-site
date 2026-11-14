"""Offline tests; no credentials or network are used. Rename-safe for the CI copy."""
import contextlib
import gzip
import importlib.util
import io
import json
from pathlib import Path
import posixpath
import unittest
from unittest.mock import patch

folder = Path(__file__).resolve().parent
source = folder / ("hosting-logs.py" if (folder / "hosting-logs.py").exists() else "ftp-log-diagnostic.py")
spec = importlib.util.spec_from_file_location("hosting_log_diagnostic", source)
diagnostic = importlib.util.module_from_spec(spec)
spec.loader.exec_module(diagnostic)


def access(path="/otdelka-balkonov/?private=sentinel-query", timing="", ua="HeadlessChrome/157.0.0.0 Edg/157.0.0.0", stamp="14/Nov/2026:17:19:14 +0300"):
    return ('203.0.113.42 - - [' + stamp + '] "GET ' + path + ' HTTP/2.0" 200 36009 "https://example.invalid/private-referrer" "' + ua + '" ' + timing + '\n').encode()


class FakeFTP:
    def __init__(self, files=None):
        self.here = "/account/www"
        self.files = files or {"/account/logs/artbalkon.site.access.log": access(timing="rt=23.85 uct=0.001 uht=23.8 urt=23.82")}
        self.commands = []
        self.reads = []
        self.rests = []

    def pwd(self):
        return self.here

    def cwd(self, path):
        self.here = posixpath.normpath(path if path.startswith("/") else posixpath.join(self.here, path))

    def retrlines(self, command, callback):
        self.commands.append(command)
        if self.here == "/account":
            rows = ["type=dir; logs", "type=dir; other-domain.invalid", "type=file; mail-config.php"]
        elif self.here == "/account/logs":
            rows = ["type=file; " + posixpath.basename(name) for name in self.files]
            rows += ["type=file; other-domain.invalid.access.log", "type=OS.unix=slink; artbalkon.site.error.log"]
        else:
            rows = []
        for row in rows:
            callback(row)

    def voidcmd(self, command):
        self.commands.append(command)
        assert command == "TYPE I"

    def size(self, path):
        return len(self.files[path])

    def retrbinary(self, command, callback, blocksize, rest=None):
        assert command.startswith("RETR ")
        path = command[5:]
        self.reads.append(path)
        self.rests.append(rest)
        data = self.files[path][rest or 0:]
        for start in range(0, len(data), blocksize):
            callback(data[start:start + blocksize])

    def quit(self):
        self.commands.append("QUIT")

    def close(self):
        pass


class DiagnosticTests(unittest.TestCase):
    def test_scope_rejects_other_domains_and_non_logs(self):
        for name in ("other.invalid.access.log", "artbalkon.site.evil.com.log", "artbalkon.site.mail.log", "artbalkon.site.php", "../access.log", "access.log", "artbalkon.site.conf", "artbalkon.site.log\r\nDELE x"):
            self.assertIsNone(diagnostic.log_kind(name), name)
        self.assertEqual(diagnostic.log_kind("artbalkon.site-ssl.access.log.2026-11-14.gz"), "access")
        self.assertEqual(diagnostic.log_kind("error.log", True), "error")

    def test_private_fields_not_returned(self):
        result = diagnostic.inspect_bytes(access(timing="rt=23.85 uht=23.8"), "access")
        self.assertEqual(result["target_requests"], 1)
        self.assertEqual(result["target_records"][0], {"timestamp_utc": "2026-11-14T14:19:14+00:00", "status": "200", "headless_chrome157": True, "timings_seconds": {"request_time": 23.85, "upstream_header_time": 23.8}})
        output = json.dumps(result)
        for private in ("203.0.113.42", "sentinel-query", "private-referrer", "HeadlessChrome", "Edg/", "/otdelka-balkonov/"):
            self.assertNotIn(private, output)

    def test_query_referrer_and_ua_cannot_inject_timings(self):
        result = diagnostic.inspect_bytes(access(path="/otdelka-balkonov/?rt=999&uht=888", ua="rt=777 uct=666 sentinel-UA"), "access")
        self.assertEqual(result["target_timings_seconds"], {})
        self.assertEqual(result["target_records"][0]["timings_seconds"], {})
        self.assertFalse(result["target_records"][0]["headless_chrome157"])

    def test_referrer_or_query_cannot_fake_target_path(self):
        result = diagnostic.inspect_bytes(access(path="/unrelated/?next=/otdelka-balkonov/"), "access")
        self.assertEqual(result["target_requests"], 0)

    def test_only_incident_window_and_target_are_counted(self):
        result = diagnostic.inspect_bytes(access() + access(stamp="14/Nov/2026:17:21:00 +0300") + access(path="/"), "access")
        self.assertEqual(result["window_records"], 2)
        self.assertEqual(result["target_requests"], 1)

    def test_unzoned_errors_are_never_assigned_to_utc_window(self):
        raw = b"[Sat Nov 14 17:19:14.123456 2026] server reached MaxRequestWorkers\n2026/11/14 17:19:36 [error] upstream timed out\n"
        result = diagnostic.inspect_bytes(raw, "error")
        self.assertEqual(result["records_without_timezone"], 2)
        self.assertEqual(result["window_error_categories"], {})
        self.assertEqual(result["coverage_naive_timezone_unknown"]["last"], "2026-11-14T17:19:36")

    def test_explicit_zoned_errors_are_categorized(self):
        raw = b"2026-11-14T14:19:36Z server reached MaxRequestWorkers; upstream timed out\n"
        result = diagnostic.inspect_bytes(raw, "error")
        self.assertEqual(result["window_error_categories"], {"upstream_timeout": 1, "worker_limit": 1})

    def test_gzip_and_target_record_limit(self):
        result = diagnostic.inspect_bytes(gzip.compress(access() * 40), "access", compressed=True)
        self.assertEqual(result["target_requests"], 40)
        self.assertEqual(len(result["target_records"]), 32)
        self.assertTrue(result["target_records_truncated"])
        self.assertEqual(diagnostic.inspect_bytes(b"bad", "access", compressed=True)["read_status"], "invalid_gzip")

    def test_discovery_reads_only_scoped_logs_and_sanitizes_output(self):
        ftp = FakeFTP()
        result = diagnostic.run_diagnostic(lambda: ftp)
        self.assertEqual(result["result"], "logs_accessible")
        self.assertEqual(ftp.reads, ["/account/logs/artbalkon.site.access.log"])
        output = json.dumps(result)
        for private in ("/account", "artbalkon.site", "other-domain", "sentinel-query", "203.0.113.42", "mail-config"):
            self.assertNotIn(private, output)

    def test_tail_rest_is_bounded(self):
        raw = b"x" * 200 + b"\n" + access()
        ftp = FakeFTP({"/account/logs/artbalkon.site.access.log": raw})
        with patch.object(diagnostic, "MAX_BYTES", len(access()) + 3):
            result = diagnostic.run_diagnostic(lambda: ftp)
        self.assertEqual(ftp.rests, [len(raw) - len(access()) - 3])
        self.assertTrue(result["files"][0]["truncated"])
        self.assertEqual(result["files"][0]["target_requests"], 1)

    def test_file_and_gzip_limits(self):
        ftp = FakeFTP({"/account/logs/artbalkon.site.access.log.%d" % i: access() for i in range(20)})
        result = diagnostic.run_diagnostic(lambda: ftp)
        self.assertEqual(len(ftp.reads), 12)
        self.assertEqual(len(result["files"]), 12)
        ftp = FakeFTP({"/account/logs/artbalkon.site.access.log.gz": b"x" * 20})
        with patch.object(diagnostic, "MAX_BYTES", 10):
            result = diagnostic.run_diagnostic(lambda: ftp)
        self.assertEqual(ftp.reads, [])
        self.assertEqual(result["files"][0]["read_status"], "skipped_large_gzip")

    def test_connection_failure_does_not_echo_exception_or_credentials(self):
        def fail():
            raise OSError("sentinel-password@private-host 203.0.113.42")
        result = diagnostic.run_diagnostic(fail)
        self.assertEqual(result["result"], "inaccessible")
        self.assertNotIn("sentinel", json.dumps(result))

    def test_mutating_ftp_commands_are_blocked(self):
        ftp = diagnostic.ReadOnlyFTP()
        for verb in ("STOR", "APPE", "DELE", "RNFR", "RNTO", "MKD", "RMD", "SITE", "PORT"):
            with self.assertRaises(ValueError):
                ftp.putcmd(verb + " sentinel")
        with patch("ftplib.FTP.putcmd", return_value=None):
            ftp.putcmd("RETR /logs/artbalkon.site.access.log")

    def test_deadline_and_no_credentials(self):
        ticks = iter((0, 201))
        result = diagnostic.run_diagnostic(lambda: FakeFTP(), now=lambda: next(ticks))
        self.assertEqual(result["reason"], "wall_budget_exhausted")
        output = io.StringIO()
        with patch.dict("os.environ", {}, clear=True), contextlib.redirect_stdout(output):
            diagnostic.main()
        self.assertEqual(json.loads(output.getvalue()), {"result": "inaccessible", "reason": "credentials_not_configured"})


if __name__ == "__main__":
    unittest.main()
