"""One bounded, read-only FTP log inspection. Stdout contains sanitized aggregates only."""
import collections
import datetime as dt
import ftplib
import gzip
import io
import json
import os
import re
import ssl
import time
from urllib.parse import urlsplit

UTC = dt.timezone.utc
START = dt.datetime(2026, 11, 14, 14, 18, 30, tzinfo=UTC)
END = dt.datetime(2026, 11, 14, 14, 20, 0, tzinfo=UTC)
MAX_FILES, MAX_BYTES, MAX_EXPANDED = 12, 8 * 1024 * 1024, 16 * 1024 * 1024
MAX_LISTINGS, MAX_ENTRIES, BUDGET = 12, 2048, 200
COMMANDS = frozenset("USER PASS AUTH PBSZ PROT TYPE PASV EPSV MLSD LIST PWD CWD SIZE RETR REST QUIT".split())
MONTHS = {name: i for i, name in enumerate("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(), 1)}
DOMAINS = frozenset(("artbalkon.site", "www.artbalkon.site"))
LOG_DIRS = frozenset(("logs", "access-logs"))
TOKENS = frozenset(("access", "error", "ssl", "nginx", "apache", "httpd", "log", "logs", "http", "https", "combined", "gz"))
ERROR_PATTERNS = {
    "upstream_timeout": r"upstream timed out|timeout.*(?:upstream|backend)|(?:upstream|backend).*timeout",
    "upstream_connection": r"connect\(\) failed|connection refused|upstream prematurely closed|connection reset",
    "worker_limit": r"MaxRequestWorkers|MaxClients|scoreboard is full|no free.*workers|process limit|resource limit",
    "memory": r"cannot allocate memory|memory exhausted|out of memory",
    "rate_or_security": r"limiting requests|request limit|ModSecurity|mod_evasive|ddos|access denied|client denied",
    "restart_or_crash": r"segmentation fault|child.*(?:exit|signal)|resuming normal operations|graceful restart",
    "storage": r"no space left|input/output error|too many open files",
}
TIMINGS = {
    "request_time": (r"(?:request_time|rt)", 1),
    "upstream_connect_time": (r"(?:upstream_connect_time|uct)", 1),
    "upstream_header_time": (r"(?:upstream_header_time|uht)", 1),
    "upstream_response_time": (r"(?:upstream_response_time|urt)", 1),
    "apache_duration_seconds": (r"(?:duration_us|request_duration_us)", 0.000001),
}


class BudgetExceeded(Exception):
    pass


class LimitExceeded(Exception):
    pass


class ReadOnlyGuard:
    deadline = float("inf")

    def putcmd(self, line):
        if time.monotonic() >= self.deadline:
            raise BudgetExceeded()
        if line.partition(" ")[0].upper() not in COMMANDS:
            raise ValueError("FTP command is not read-only")
        return super().putcmd(line)


class ReadOnlyFTP(ReadOnlyGuard, ftplib.FTP):
    pass


class ReadOnlyFTPTLS(ReadOnlyGuard, ftplib.FTP_TLS):
    pass


def log_kind(name, domain_scoped=False):
    """Accept domain log names, or generic logs only inside a target-domain log directory."""
    if not isinstance(name, str) or not re.fullmatch(r"[A-Za-z0-9._-]{1,200}", name):
        return None
    lower = name.lower()
    suffix = None
    for domain in sorted(DOMAINS, key=len, reverse=True):
        if lower.startswith(domain) and len(lower) > len(domain) and lower[len(domain)] in "._-":
            suffix = lower[len(domain) + 1:]
            break
    if suffix is None and domain_scoped:
        suffix = lower
    if suffix is None:
        return None
    tokens = re.split(r"[._-]+", suffix)
    if not tokens or any(not token or (token not in TOKENS and not token.isdecimal()) for token in tokens):
        return None
    if not any(token in ("access", "error", "log") for token in tokens):
        return None
    return "error" if "error" in tokens else "access"


def parse_stamp(line):
    match = re.search(r"\[(\d{2})/([A-Z][a-z]{2})/(\d{4}):(\d{2}):(\d{2}):(\d{2}) ([+-])(\d{2})(\d{2})\]", line)
    try:
        if match:
            day, month, year, hour, minute, second, sign, oh, om = match.groups()
            offset = dt.timedelta(hours=int(oh), minutes=int(om)) * (1 if sign == "+" else -1)
            return dt.datetime(int(year), MONTHS[month], int(day), int(hour), int(minute), int(second), tzinfo=dt.timezone(offset)).astimezone(UTC)
        match = re.search(r"^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\b", line)
        if match:
            return dt.datetime.fromisoformat(match.group(1).replace("Z", "+00:00"))
        match = re.match(r"^(\d{4})/(\d{2})/(\d{2}) (\d{2}):(\d{2}):(\d{2})\b", line)
        if match:
            return dt.datetime(*map(int, match.groups()))
        match = re.search(r"\[(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) ([A-Z][a-z]{2}) +(\d{1,2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d+))? (\d{4})\]", line)
        if match:
            month, day, hour, minute, second, fraction, year = match.groups()
            return dt.datetime(int(year), MONTHS[month], int(day), int(hour), int(minute), int(second), int(((fraction or "") + "000000")[:6]))
    except (ValueError, KeyError):
        return None
    return None


def target_request(line):
    match = re.search(r'"(?:GET|HEAD|POST|OPTIONS) ([^"\s]+) HTTP/[0-9.]+"\s+(\d{3})\b', line)
    if not match:
        return None
    try:
        parsed = urlsplit(match.group(1))
        if parsed.netloc and parsed.hostname not in DOMAINS:
            return None
        return match.group(2) if parsed.path in ("/otdelka-balkonov/", "/otdelka-balkonov") else None
    except ValueError:
        return None


def inspect_bytes(data, kind, compressed=False, truncated=False):
    if compressed:
        if truncated:
            return {"read_status": "skipped_gzip_tail"}
        try:
            with gzip.GzipFile(fileobj=io.BytesIO(data)) as stream:
                data = stream.read(MAX_EXPANDED + 1)
            if len(data) > MAX_EXPANDED:
                return {"read_status": "expanded_size_limit"}
        except (OSError, EOFError):
            return {"read_status": "invalid_gzip"}
    lines = data.decode("utf-8", "replace").splitlines()
    if truncated and lines:
        lines = lines[1:]  # The REST tail can start in the middle of a record.
    ranges, naive_ranges, status_counts, errors, timing_values = [], [], collections.Counter(), collections.Counter(), collections.defaultdict(list)
    window_count = target_count = headless_count = unzoned = 0
    target_records = []
    for line in lines:
        stamp = parse_stamp(line)
        if stamp is None:
            continue
        if stamp.tzinfo is None:
            unzoned += 1
            naive_ranges.append(stamp)
            continue  # Never silently assume the hosting's timezone.
        stamp = stamp.astimezone(UTC)
        ranges.append(stamp)
        if not START <= stamp <= END:
            continue
        window_count += 1
        if kind == "error":
            for category, pattern in ERROR_PATTERNS.items():
                if re.search(pattern, line, re.I):
                    errors[category] += 1
        status = target_request(line)
        if status is None:
            continue
        target_count += 1
        status_counts[status] += 1
        quoted_fields = re.findall(r'"((?:\\.|[^"\\])*)"', line)
        headless = len(quoted_fields) >= 3 and "HeadlessChrome/157.0.0.0" in quoted_fields[2]
        headless_count += int(headless)
        named_fields = re.sub(r'"(?:\\.|[^"\\])*"', "", line)
        record_timings = {}
        # Only explicit named fields are timing evidence; unlabeled numbers are ambiguous.
        for key, (pattern, scale) in TIMINGS.items():
            found = re.search(r'(?<![\w])' + pattern + r'\s*[=:]\s*([0-9]+(?:\.[0-9]+)?(?:\s*[,;:]\s*[0-9]+(?:\.[0-9]+)?)*)', named_fields)
            if found:
                values = [round(float(value) * scale, 6) for value in re.findall(r"[0-9]+(?:\.[0-9]+)?", found.group(1))]
                timing_values[key].extend(values)
                record_timings[key] = values[0] if len(values) == 1 else values
        if len(target_records) < 32:
            target_records.append({"timestamp_utc": stamp.isoformat(), "status": status, "headless_chrome157": headless, "timings_seconds": record_timings})
    span = lambda values: {"first": min(values).isoformat(), "last": max(values).isoformat()} if values else None
    return {
        "read_status": "parsed", "line_count": len(lines), "coverage_utc": span(ranges), "coverage_naive_timezone_unknown": span(naive_ranges),
        "records_without_timezone": unzoned, "window_records": window_count, "target_requests": target_count,
        "target_status_counts": dict(status_counts), "target_headless_chrome157_count": headless_count,
        "target_records": target_records, "target_records_truncated": target_count > len(target_records),
        "target_timings_seconds": {key: {"samples": len(values), "min": round(min(values), 6), "max": round(max(values), 6)} for key, values in timing_values.items()},
        "window_error_categories": dict(errors),
    }


def parse_listing(line, machine):
    if machine:
        facts, separator, name = line.partition(" ")
        if not separator:
            return None
        fields = dict(item.split("=", 1) for item in facts.split(";") if "=" in item)
        typ = fields.get("type", "").lower()
        return (name, typ) if typ in ("file", "dir") else None
    pieces = line.split(None, 8)
    if len(pieces) != 9 or pieces[0][0:1] not in ("-", "d"):
        return None  # Symlinks and unrecognized listing formats are not followed.
    return pieces[8], "dir" if pieces[0][0] == "d" else "file"


def run_diagnostic(connect, now=time.monotonic):
    deadline = now() + BUDGET
    result = {"result": "inaccessible", "window_start_utc": START.isoformat(), "window_end_utc": END.isoformat(), "files": [], "limits": {"max_files": MAX_FILES, "max_bytes_per_file": MAX_BYTES, "max_target_records_per_file": 32, "wall_budget_seconds": BUDGET, "access_format": "common/combined request and explicit unquoted named timing fields", "timestamps": "CLF numeric offset or leading ISO8601; Apache/nginx zoneless error timestamps remain unzoned", "generic_logs": "read only below an exact target-domain directory inside logs/access-logs", "symlinks": "arbitrary links not followed; only documented log directories may be entered", "large_gzip": "skipped; gzip tails cannot be decoded"}, "scan": {"directories_listed": 0, "directory_failures": 0, "scoped_files_found": 0}}
    ftp = None
    candidates, visited = {}, set()

    def check():
        if now() >= deadline:
            raise BudgetExceeded()

    def listing(path):
        check()
        if result["scan"]["directories_listed"] >= MAX_LISTINGS:
            return None
        try:
            ftp.cwd(path)
            identity = ftp.pwd()
            if identity in visited:
                return None
            visited.add(identity)
            result["scan"]["directories_listed"] += 1
            entries = []
            def receive(line):
                check()
                if len(entries) >= MAX_ENTRIES:
                    raise LimitExceeded()
                entries.append(line)
            machine = True
            try:
                ftp.retrlines("MLSD", receive)
            except ftplib.error_perm:
                entries.clear()
                machine = False
                ftp.retrlines("LIST", receive)
            return identity, [entry for line in entries if (entry := parse_listing(line, machine))]
        except ftplib.error_perm:
            result["scan"]["directory_failures"] += 1
            return None

    def collect(path, scoped=False, depth=0):
        found = listing(path)
        if not found:
            return
        identity, entries = found
        for name, typ in entries:
            if name in (".", "..") or not re.fullmatch(r"[A-Za-z0-9._-]{1,200}", name):
                continue
            kind = log_kind(name, scoped)
            full = identity.rstrip("/") + "/" + name
            if typ == "file" and kind:
                candidates.setdefault(full, (kind, name.lower().endswith(".gz")))
            elif typ == "dir" and depth < 2 and ((depth == 0 and name.lower() in LOG_DIRS) or (depth == 1 and name.lower() in DOMAINS)):
                collect(full, scoped=name.lower() in DOMAINS, depth=depth + 1)

    try:
        ftp = connect()
        ftp.deadline = deadline
        root = ftp.pwd()
        for anchor in (root, root.rstrip("/") + "/..", root.rstrip("/") + "/../.."):
            collect(anchor)
            # A hosting panel can expose its documented log directory as a link,
            # which MLSD intentionally excludes from ordinary traversal. Probe
            # these two fixed locations through the account's own FTP permissions;
            # never follow arbitrary links or read logs for another domain.
            for directory in sorted(LOG_DIRS):
                collect(anchor.rstrip("/") + "/" + directory, depth=1)
        result["scan"]["scoped_files_found"] = len(candidates)
        # Prefer the incident date and current uncompressed logs, then rotations.
        ordered = sorted(candidates, key=lambda path: (not ("2026-11-14" in path or "20261114" in path), candidates[path][1], path))
        for path in ordered[:MAX_FILES]:
            check()
            kind, compressed = candidates[path]
            record = {"id": "log%02d" % (len(result["files"]) + 1), "kind": kind, "gzip": compressed}
            result["files"].append(record)
            try:
                ftp.voidcmd("TYPE I")
                size = ftp.size(path)
                if size is None or size < 0:
                    record["read_status"] = "size_unavailable"
                    continue
                offset = max(0, size - MAX_BYTES)
                record.update(file_size_bytes=size, truncated=bool(offset))
                if compressed and offset:
                    record["read_status"] = "skipped_large_gzip"
                    continue
                data = bytearray()
                def receive_bytes(block):
                    check()
                    if len(data) + len(block) > MAX_BYTES:
                        raise LimitExceeded()
                    data.extend(block)
                ftp.retrbinary("RETR " + path, receive_bytes, blocksize=65536, rest=offset if offset else None)
                record["bytes_read"] = len(data)
                record.update(inspect_bytes(bytes(data), kind, compressed, bool(offset)))
            except ftplib.error_perm:
                record["read_status"] = "read_denied_or_rest_unsupported"
        if result["files"]:
            result["result"] = "logs_accessible" if any(row.get("read_status") == "parsed" for row in result["files"]) else "logs_visible_unreadable"
        else:
            result["reason"] = "no_scoped_logs_visible"
    except BudgetExceeded:
        result["reason"] = "wall_budget_exhausted"
    except LimitExceeded:
        result["reason"] = "transfer_or_listing_limit"
    except (OSError, EOFError, ftplib.Error, ValueError):
        result["reason"] = "connection_or_protocol_unavailable"
    except Exception:
        result["reason"] = "diagnostic_unavailable"
    finally:
        if ftp is not None:
            try:
                ftp.quit()
            except Exception:
                ftp.close()
    if any(row.get("read_status") == "parsed" for row in result["files"]) and result["result"] == "inaccessible":
        result["result"] = "partial_logs_accessible"
    return result


def main():
    host, user, password = (os.environ.get("FTP_" + key, "") for key in ("HOST", "USER", "PASSWORD"))
    if not all((host, user, password)):
        output = {"result": "inaccessible", "reason": "credentials_not_configured"}
    else:
        def connect():
            tls = os.environ.get("FTP_TLS", "false").lower() == "true"
            ftp = ReadOnlyFTPTLS(context=ssl.create_default_context(), timeout=15) if tls else ReadOnlyFTP(timeout=15)
            try:
                ftp.connect(host, int(os.environ.get("FTP_PORT", "21")))
                ftp.login(user, password)
                if tls:
                    ftp.prot_p()
                return ftp
            except Exception:
                ftp.close()
                raise
        output = run_diagnostic(connect)
    print(json.dumps(output, ensure_ascii=True, separators=(",", ":")))


if __name__ == "__main__":
    main()
