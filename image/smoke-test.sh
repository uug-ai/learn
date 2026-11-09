#!/usr/bin/env bash
set -euo pipefail

image=${1:?image reference required}
container="learn-smoke-$$"
directory=$(mktemp -d)
cleanup() {
  docker logs "$container" > smoke.log 2>&1
  docker rm -f "$container"
  rm -r "$directory"
}
docker run -d --name "$container" --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /tmp:rw,noexec,nosuid,size=16m,mode=1777 \
  -p 127.0.0.1::8080 "$image"
trap cleanup EXIT
port=$(docker port "$container" 8080/tcp)
origin="http://$port"
ready=false
for attempt in $(seq 1 30); do
  echo "Learn readiness attempt $attempt/30"
  if curl --fail --max-time 2 "$origin/healthz" > /dev/null; then
    ready=true
    break
  fi
  sleep 1
done
test "$ready" = true
test "$(docker inspect "$container" --format '{{.Config.User}}')" = 65532:65532
test "$(curl --fail --silent --show-error "$origin/healthz")" = ok
curl --fail --silent --show-error -D "$directory/headers" "$origin/" > "$directory/index.html"
grep -iq '^Access-Control-Allow-Origin: \*' "$directory/headers"
if grep -iq '^Server: nginx/' "$directory/headers"; then
  echo "::error::Nginx version is exposed"
  exit 1
fi
for path in /docs/ /docs/hub/ /tutorials/; do
  curl --fail --silent --show-error "$origin$path" > "$directory/page.html"
  test -s "$directory/page.html"
  if cmp -s "$directory/index.html" "$directory/page.html"; then
    echo "::error::$path returned the home page instead of its generated page"
    exit 1
  fi
done
for path in /missing-smoke-route /missing-smoke-route/ /missing-smoke-asset.js; do
  status=$(curl --silent --show-error -o "$directory/not-found.html" -w '%{http_code}' "$origin$path")
  test "$status" = 404
  grep -q 'Page not found' "$directory/not-found.html"
done
curl --fail --silent --show-error -D "$directory/robots-headers" "$origin/robots.txt" > "$directory/robots.txt"
grep -iq '^Content-Type: text/plain' "$directory/robots-headers"
grep -q '^User-agent: \*' "$directory/robots.txt"
grep -q '^Sitemap: https://learn.uug.ai/sitemap.xml' "$directory/robots.txt"
curl --fail --silent --show-error "$origin/tutorials/hub/connect-your-vms-to-claude/" > "$directory/tutorial.html"
grep -q 'application/ld+json' "$directory/tutorial.html"
for extension in css js; do
  asset=$(grep -oE "(src|href)=[\"']?/[^\"'<>[:space:]]+\\.$extension(\\?[^\"'<>[:space:]]*)?" "$directory/index.html" | sed -n '1s/^[^/]*//p')
  test -n "$asset"
  curl --fail --silent --show-error "$origin$asset" > "$directory/asset"
  test -s "$directory/asset"
  if cmp -s "$directory/index.html" "$directory/asset"; then
    echo "::error::$asset returned HTML instead of a static asset"
    exit 1
  fi
done
