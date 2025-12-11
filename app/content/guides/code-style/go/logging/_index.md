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
    // Using API wrappers
    api.LogTrace(logger, api.CreateTrace(
            api.HttpStatusOK,
            api.ApplicationStatusSuccess,
            api.NotificationTracingFailed, // example entity status
            api.Metadata{TraceId: traceID, Function: "cacheProbe", Data: map[string]any{"key": "abc123"}},
    ), nil)
    ```

- Debug: Developer-focused state inspection.
    ```go
    api.LogDebug(logger, api.CreateDebug(
            api.HttpStatusOK,
            api.ApplicationStatusSuccess,
            api.NotificationTracingFailed,
            api.Metadata{UserId: user.ID, Function: "authFlow", Data: map[string]any{"scopes": user.Scopes}},
    ), nil)
    ```

- Info: Normal operational events.
    ```go
    api.LogInfo(logger, api.CreateSuccess(
            api.HttpStatusOK,
            api.ApplicationStatusGetSuccess,
            api.NotificationTracingFailed,
            api.Metadata{Function: "thumbnailJob", Data: map[string]any{"file": "video_1733992211.mp4"}},
    ), map[string]any{"job": "thumbnailer"})
    ```

- Warn: Non-fatal anomalies worth attention.
    ```go
    api.LogWarning(logger, api.CreateWarning(
            api.HttpStatusServiceUnavailable,
            api.ApplicationStatusGetFailed,
            api.NotificationTracingFailed,
            api.Metadata{Function: "publish", Data: map[string]any{"retry_in_ms": 500}},
    ), nil)
    ```

- Error: Failures that didn’t crash the process.
    ```go
    api.LogError(logger, api.CreateError(
            api.HttpStatusInternalServerError,
            api.ApplicationStatusError,
            api.NotificationTracingFailed,
            api.Metadata{DeviceId: device.ID, Error: err.Error(), Function: "mediaTransfer"},
    ))
    ```

- Fatal: Critical error leading to process exit (calls os.Exit(1)).
    ```go
    api.LogFatal(logger, api.CreateFatal(
            api.HttpStatusServiceUnavailable,
            api.ApplicationStatusError,
            api.NotificationTracingFailed,
            api.Metadata{Function: "startup", Error: "missing DB URI"},
    ), nil)
    ```

- Panic: Unexpected invariant violation (calls panic() after logging).
    ```go
    api.LogPanic(logger, api.CreatePanic(
            api.HttpStatusInternalServerError,
            api.ApplicationStatusError,
            api.NotificationTracingFailed,
            api.Metadata{Function: "streamRead", Error: "negative bytes read"},
    ), nil)
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
