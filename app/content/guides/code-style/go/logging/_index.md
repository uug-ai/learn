title: Logging
toc: false
---

In Go projects we use Logrus as our logging tool. We use the provided Logrus logging levels wrapped in a function defined in our [api models](https://github.com/uug-ai/models/blob/main/pkg/api/api.go), each with a custom response type initiated by its constructor function. 

Response types should at least contain the following:
```go
httpStatusCode int
applicationStatusCode string
entityStatusCode EntityStatus
```
    
### Levels

- Trace: Extremely low-level, noisy details.
    ```go
    logrus.Trace("cache miss; key=abc123; probing secondary store")
    ```

- Debug: Developer-focused state inspection.
    ```go
    logrus.Debugf("auth flow: user=%s scopes=%v", user.ID, user.Scopes)
    ```

- Info: Normal operational events.
    ```go
    logrus.WithFields(logrus.Fields{"job": "thumbnailer", "file": "video_1733992211.mp4"}).Info("job started")
    ```

- Warn: Non-fatal anomalies worth attention.
    ```go
    logrus.WithField("retry_in_ms", 500).Warn("queue publish failed; will retry")
    ```

- Error: Failures that didn’t crash the process.
    ```go
    logrus.WithError(err).WithField("device_id", device.ID).Error("media transfer failed")
    ```

- Fatal: Critical error leading to process exit (calls os.Exit(1)).
    ```go
    if cfg.DBURI == "" { logrus.Fatal("missing DB URI; cannot start service") }
    ```

- Panic: Unexpected invariant violation (calls panic() after logging).
    ```go
    if bytesRead < 0 { logrus.Panic("negative bytes read; corrupt stream") }
    ```

### Usage

For example:

```go
func LogError(logger *logrus.Logger, errorResponse ErrorResponse) {
	logger.WithFields(CreateErrorLog(logger, errorResponse)).Error()
}
```

Can be used as:

```go
api.LogError(logger, api.CreateError(
    api.HttpStatusServiceUnavailable,
    api.ApplicationStatusError,
    api.NotificationTracingFailed,
    api.Metadata{},
))
```

Logger initialization example:

```go
import (
    "github.com/sirupsen/logrus"
)

logrus.SetFormatter(&logrus.JSONFormatter{})
logrus.SetOutput(os.Stdout)
logrus.SetLevel(logrus.InfoLevel)

// Set log level
logLevel := os.Getenv("LOG_LEVEL")
switch logLevel {
case "error":
    logrus.SetLevel(logrus.ErrorLevel)
case "debug":
    logrus.SetLevel(logrus.DebugLevel)
default:
    logrus.SetLevel(logrus.InfoLevel)
}

// Initialize logger
logger := logrus.New()
```
