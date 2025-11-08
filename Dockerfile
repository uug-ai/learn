FROM mcr.microsoft.com/devcontainers/go:1.24-bookworm AS builder

ARG APP_NAME=documentation
ARG github_username
ARG github_token

# For maximum backward compatibility with Hugo modules
ENV HUGO_ENVIRONMENT=production
ENV HUGO_ENV=production

WORKDIR /build

# Copy the code necessary to build the application
# You may want to change this to copy only what you actually need.
COPY . .

# Get local dependencies from private repo.
RUN git config --global \
    url."https://${github_username}:${github_token}@github.com/".insteadOf \
    "https://github.com/"

# Set working directory to the app folder
WORKDIR /build/app

# Install Go dependencies
RUN go mod tidy

# Install Hugo
RUN go install -tags extended,withdeploy github.com/gohugoio/hugo@latest && \
    hugo version && \
    hugo --gc --minify --baseURL "https://docs.uug.ai/"

# Copy or create other directories/files your app needs during runtime.
# E.g. this example uses /data as a working directory that would probably
#      be bound to a perstistent dir when running the container normally
RUN mkdir /data
RUN cp -r public /data/site

FROM alpine:latest

RUN apk update && apk add ca-certificates curl libstdc++ libc6-compat --no-cache && rm -rf /var/cache/apk/*

# Install nginx
RUN apk add --no-cache nginx

# Copy nginx configuration
COPY --chown=65534:0 nginx.conf /etc/nginx/conf.d/default.conf

# Set up the app to run as a non-root user inside the /data folder
# User ID 65534 is usually user 'nobody'.
# The executor of this image should still specify a user during setup.
COPY --chown=65534:0 --from=builder /data /data
USER 65534
WORKDIR /data

ENTRYPOINT ["sh", "-c", "nginx -g 'daemon off;'"]
