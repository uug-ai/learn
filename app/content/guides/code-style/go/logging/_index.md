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

- logrus.Trace("Something very low level.")
- logrus.Debug("Useful debugging information.")
- logrus.Info("Something noteworthy happened!")
- logrus.Warn("You should probably take a look at this.")
- logrus.Error("Something failed but I'm not quitting.")
    // Calls os.Exit(1) after logging
- logrus.Fatal("Bye.")
    // Calls panic() after logging
- logrus.Panic("I'm bailing.")

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
