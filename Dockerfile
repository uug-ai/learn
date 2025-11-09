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
    hugo --gc --minify

# Copy or create other directories/files your app needs during runtime.
# E.g. this example uses /data as a working directory that would probably
#      be bound to a perstistent dir when running the container normally
RUN mkdir /data
RUN cp -r public /data/site

# ---- Final Stage ----
FROM nginx:alpine

COPY --from=builder /data/site /usr/share/nginx/html

# Permissions for nginx to access the files
RUN chown -R nginx:nginx /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]