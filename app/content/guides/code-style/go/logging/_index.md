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

- LogDebug: Detailed information during development.
- LogInfo: General runtime information about the application.
- LogWarn: Notifications about potential issues or minor problems.
- LogError: Logs for significant issues that require attention.
- LogFatal: Critical errors that terminate the program (exits).
- LogPanic: Severe issues causing the program to panic (panics).

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
