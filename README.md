**--- DELETE START ---**

# Alpine JS Plugin Template

This is a template repository to help developers quickly build Alpine JS
plugins.

## How to Use

1. Clone the repository with the "Use this template" button on GitHub
2. Run `npm install` to install ES Build
3. Build your plugin

### Compiling

To compile the code you run `npm run build` which will create two files in the
`/dist` directory.

### Testing

In this template you will find a `index.html` file that you can use for testing
how the Alpine JS plugin works.

I recommend using [vercel/serve](https://www.npmjs.com/package/serve) to serve
this file.

## Things to Change

- Find and replace "PLUGIN" with the name of your plugin
- Find and replace "FILE" with the name of your compiled file
- Find and replace "DESCRIPTION" with a description of your plugin
- Uncomment "index.html" in the `.gitignore` file

🚨 Make sure find and replace is case sensitive

If you were creating a plugin called "Alpine JS CSV" you could do the following:

- "alpinejs-highlight" to "alpinejs-csv"
- "FILE" to "csv"
- "DESCRIPTION" to "Transform data into a CSV with Alpine JS 📈"

---

### License

The choice of adding a license and what license is best for your project is up
to you.

[Adding a License on GitHub](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/adding-a-license-to-a-repository)

**--- DELETE END ---**

# alpinejs-highlight

Flexible highlighting of text matches with Alpine.js 🔦

## Install

### With a CDN

```html
<script src="https://unpkg.com/alpinejs-highlight@latest/dist/highlight.min.js" defer></script>

<script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
```

### With a Package Manager

```shell
yarn add -D alpinejs-highlight

npm install -D alpinejs-highlight
```

```js
import Alpine from 'alpinejs'
import highlight from 'alpinejs-highlight'

Alpine.plugin(highlight)
Alpine.start()
```

## Example

Examples of how the plugin works.

## Stats

![](https://img.shields.io/bundlephobia/min/alpinejs-highlight)
![](https://img.shields.io/npm/v/alpinejs-highlight)
![](https://img.shields.io/npm/dt/alpinejs-highlight)
![](https://img.shields.io/github/license/markmead/alpinejs-highlight)
