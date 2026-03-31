# Documentation

A modern, fast, and feature-rich documentation website built with [Hugo](https://gohugo.io/) and the [Hextra](https://github.com/imfing/hextra) theme.

## Features

- 📝 **Fast & Lightweight**: Built with Hugo, one of the fastest static site generators
- 🎨 **Modern Design**: Clean and responsive UI powered by the Hextra theme
- 🔍 **Full-Text Search**: Built-in search functionality
- 🌙 **Dark Mode**: Automatic dark mode support
- 📱 **Mobile-Friendly**: Fully responsive design
- 🚀 **SEO Optimized**: Built-in SEO best practices
- 📦 **Easy to Deploy**: Static files that can be hosted anywhere

## Prerequisites

- [Hugo](https://gohugo.io/installation/) (Extended version >= 0.112.0)
- [Git](https://git-scm.com/)

## Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/uug-ai/documentation.git
cd documentation
```

2. Install the Hextra theme:
```bash
cd app
hugo mod get -u github.com/imfing/hextra
```

To work on the theme locally, vendor it into the project:
```bash
cd app
hugo mod vendor
```

This makes the Hextra source available under `app/_vendor/github.com/imfing/hextra/`, including editable CSS files such as `assets/css/styles.css` and `assets/css/custom.css`.

Or if using Git submodules:
```bash
git submodule add https://github.com/imfing/hextra.git app/themes/hextra
git submodule update --init --recursive
```

### Local Development

1. Navigate to the app directory:
```bash
cd app
```

2. Start the Hugo development server:
```bash
hugo server -D
```

3. Open your browser and visit `http://localhost:1313`

The site will automatically reload when you make changes to the content.

## Project Structure

```
.
├── app/
│   ├── archetypes/       # Content templates
│   ├── assets/           # CSS, JS, images
│   ├── content/          # Documentation content (Markdown files)
│   ├── data/             # Data files
│   ├── i18n/             # Internationalization files
│   ├── layouts/          # Custom layout templates
│   ├── static/           # Static files (copied as-is)
│   ├── themes/           # Hugo themes
│   └── hugo.toml         # Hugo configuration
├── Dockerfile            # Docker configuration
└── README.md            # This file
```

## Creating Content

### Adding a New Page

Create a new Markdown file in the `app/content/` directory:

```bash
cd app
hugo new docs/your-page.md
```

Edit the file with your content:

```markdown
---
title: "Your Page Title"
date: 2025-11-07
draft: false
---

Your content here...
```

### Organizing Content

Content is organized in the `app/content/` directory. Create subdirectories to structure your documentation:

```
content/
├── _index.md          # Homepage
├── docs/
│   ├── _index.md      # Docs section index
│   ├── getting-started/
│   ├── guides/
│   └── reference/
```

## Configuration

The main configuration file is `app/hugo.toml`. Customize it to match your project:

```toml
baseURL = 'https://docs.example.com/'
languageCode = 'en-us'
title = 'Your Documentation Site'
theme = 'hextra'
```

## Building for Production

To build the static site for production:

```bash
cd app
hugo --minify
```

The generated site will be in the `app/public/` directory.

## Deployment

The site can be deployed to various platforms:

- **GitHub Pages**: Use GitHub Actions workflow
- **Netlify**: Connect your repository and set build command to `cd app && hugo --minify`
- **Vercel**: Similar to Netlify
- **Docker**: Use the included Dockerfile

### Docker Deployment

Build and run with Docker:

```bash
docker build -t docs-site .
docker run -p 8080:80 docs-site
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Resources

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Hextra Theme Documentation](https://imfing.github.io/hextra/)
- [Markdown Guide](https://www.markdownguide.org/)

## License

[Add your license here]

## Support

For issues and questions, please open an issue on GitHub.
