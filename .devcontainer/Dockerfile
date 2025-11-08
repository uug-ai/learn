FROM mcr.microsoft.com/devcontainers/go:1.24-bookworm

# Install node environment
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    nodejs graphviz npm \
    && rm -rf /var/lib/apt/lists/*

# Install nodejs
RUN curl -o- https://fnm.vercel.app/install | bash && \
    . $HOME/.bashrc && \
    fnm install 24

# Install tailwindcss
RUN npm install -g tailwindcss @tailwindcss/cli

# Switch back to vscode user
USER vscode

# Install go swagger
RUN go install github.com/swaggo/swag/cmd/swag@latest

# Install hugo
#RUN go install github.com/gohugoio/hugo@latest
RUN CGO_ENABLED=1 go install -tags extended,withdeploy github.com/gohugoio/hugo@latest

