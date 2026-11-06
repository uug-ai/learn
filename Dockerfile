# syntax=docker/dockerfile:1
FROM golang:1.26.10-bookworm@sha256:632dff7351799a5a9954a48dc06670ade72ee44e8c351cdc0e5a57af2fea21af AS builder
ENV HUGO_ENVIRONMENT=production
ENV HUGO_ENV=production
ENV GOTOOLCHAIN=local

RUN go install -tags extended github.com/gohugoio/hugo@v0.165.0
WORKDIR /build/app
COPY app/ ./
RUN hugo --gc --minify --destination /site && \
    find /site -type d -exec chmod 0755 {} + && \
    find /site -type f -exec chmod 0444 {} +

FROM builder AS test
RUN test -s /site/index.html && \
    test -s /site/docs/index.html && \
    test -s /site/docs/hub/index.html && \
    test -s /site/tutorials/index.html && \
    test -s /site/sitemap.xml

FROM cgr.dev/chainguard/nginx:latest@sha256:9aa6c46648f17b2835d009fd4338b38591b2396670a07270ee19b532f83dbbb5
ARG VERSION=dev
ARG REVISION=unknown
ARG CREATED
LABEL org.opencontainers.image.title="learn" \
      org.opencontainers.image.source="https://github.com/uug-ai/learn" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${CREATED}" \
      org.opencontainers.image.vendor="UUG.AI"
COPY --from=builder --chown=0:0 /site /usr/share/nginx/html
COPY --chown=0:0 --chmod=0444 nginx.conf /etc/nginx/nginx.conf
USER 65532:65532
WORKDIR /usr/share/nginx/html
EXPOSE 8080
ENTRYPOINT ["/usr/sbin/nginx"]
CMD ["-e", "/dev/stderr", "-g", "daemon off;"]