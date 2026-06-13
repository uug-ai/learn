---
title: File naming
toc: false
type: docs
---

Go source files are named in **lowercase `snake_case`**: all letters
lowercase, with underscores separating words. This is the convention the
Go standard library uses throughout (`encode.go`, `cookiejar.go`,
`reverse_proxy.go`), and it is the convention we follow across every Go
module in the monorepo.

The file name is independent of the `package` declaration and of every
identifier the file exports, so renaming a file is a purely cosmetic
change — it never affects imports or the public API of the package.

## The rule

- **All lowercase.** No `PascalCase` (`Dropbox.go`) and no `camelCase`.
- **Underscores between words** for readability: `rtsp_client.go`, not
  `rtspclient.go`.
- **No hyphens.** `kebab-case.go` is not used for Go source files.
- One file, one focused concern — name the file after what it contains
  (`s3.go`, `kerberos_hub.go`, `tus_client.go`).

## Reserved suffixes (significant to the Go toolchain)

Underscores in file names are not purely cosmetic — the `go` tool gives
special meaning to a few patterns. Avoid them unless you mean them:

| Pattern | Meaning |
| --- | --- |
| `*_test.go` | Treated as a **test file** and excluded from normal builds. |
| `*_GOOS.go` | Implicit build constraint, e.g. `server_linux.go`, `proc_windows.go`. |
| `*_GOARCH.go` | Implicit build constraint, e.g. `asm_amd64.go`, `mem_arm64.go`. |
| `*_GOOS_GOARCH.go` | Both at once, e.g. `syscall_linux_amd64.go`. |

The toolchain strips a trailing `_test` first, then checks the remainder
against the known `GOOS`/`GOARCH` values. So do **not** name a file
`metrics_windows.go` unless it really is Windows-only — it will silently
drop out of every other platform's build.

Files whose names begin with `_` or `.` are ignored by the `go` tool
entirely.

> A `test_` **prefix** is safe (`test_file.go`) — only the `_test.go`
> **suffix** is reserved.

## Example: `agent/machinery/src/cloud`

This package historically mixed `PascalCase` and `snake_case`. The
idiomatic form is on the right:

| Avoid | Prefer |
| --- | --- |
| `Cloud.go` | `cloud.go` |
| `Dropbox.go` | `dropbox.go` |
| `S3.go` | `s3.go` |
| `TestFile.go` | `test_file.go` |
| `RTSPClient.go` | `rtsp_client.go` |
| `Kerberos.go` | `kerberos.go` |
| `MQTT.go` | `mqtt.go` |
| `WebRTC.go` | `webrtc.go` |
| `AudioData.go` | `audio_data.go` |

## Renaming existing files

Because the rename only changes letter case, use `git mv` so the change
is tracked. On a case-insensitive filesystem a case-only rename needs an
intermediate step:

```bash
git mv Dropbox.go dropbox.tmp.go
git mv dropbox.tmp.go dropbox.go
```

No import paths or code change — only the file on disk.
