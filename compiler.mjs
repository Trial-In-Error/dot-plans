import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import Handlebars from 'handlebars'
import livereload from 'livereload'
import { spawn } from 'child_process'
import nodeHtmlToImage from 'node-html-to-image'
import PDFDocument from 'pdfkit'
import { setupHandlebars, buildHTMLPath, buildCSSPath, buildImagePath, buildPDFPath } from './helpers.mjs'

let config = JSON.parse(fs.readFileSync('./config.json'))
setupHandlebars(Handlebars)

const server = livereload.createServer()
const paths = [...fs.readdirSync('./templates').map((path) => './templates/' + path)]

let contexts = {
  './templates/week-left.handlebars': {},
  './templates/week-right.handlebars': {},
  './templates/week-unified.handlebars': {},
  './templates/month.handlebars': {}
}

// watch config, css, and templates, but only rebuild the templates
fs.watch('./config.json', { persistent: true }, compileTemplates)
fs.watch('./css', { persistent: true }, compileTemplates)
fs.watch('./templates', { persistent: true }, compileTemplates)

function startHotReload() {
  let htmlPaths = fs.readdirSync('./html').map((path) => './html/' + path)
  compileTemplates("change")
  server.watch(htmlPaths)
  spawn('node', ['./node_modules/http-server/bin/http-server', '-p 8082'])
  console.log('Server with compiled HTML running at: http://localhost:8082/html/')
}

function compileTemplates(eventType) {
  config = JSON.parse(fs.readFileSync('./config.json'))
  Object.keys(contexts).forEach((key) => {
    contexts[key] = config.templates[key]
    contexts[key].size = config.size
    contexts[key].dpi = config.dpi
    contexts[key].margins = config.margins
  })

  for(let i = 0; i < paths.length; i++) {
    compileTemplate(eventType, paths[i])
  }
}

function compileTemplate(eventType, templatePath) {
  console.log('eventType', eventType, 'templatePath', templatePath)
  if (eventType === 'change' && path.extname(templatePath) === '.handlebars') {
    let context = contexts[templatePath]
    let commonCSSPath = path.normalize('./css/common.css')
    let template = String(fs.readFileSync(templatePath))
    let css
    console.log('Updated %s', templatePath)
    try {
      css = String(fs.readFileSync(buildCSSPath(templatePath)))
      css += String(fs.readFileSync(commonCSSPath))
    } catch (e) {}
    const compiled = Handlebars.compile(template)
    const string = compiled({ ...context, css })
    const imagePath = buildImagePath(templatePath)
    fsp.writeFile(buildHTMLPath(templatePath), string)
      .then(() => nodeHtmlToImage({
        output: imagePath,
        html: string,
        beforeScreenshot: (p) => { return p.emulateMediaType('print') },
        puppeteerArgs: {
          defaultViewport: {
            width:  config.size[0] * config.dpi,
            height:  config.size[1] * config.dpi,
            // deviceScaleFactor: config.dpi
          }
        }
      }))
      .then(() => {
        const doc = new PDFDocument()
        doc.pipe(fs.createWriteStream(buildPDFPath(templatePath)))
        // the DPI has to be 96 when setting the puppeteer width/height args
        // but it has to be 69 when rendering to PDF...??
        doc.image(imagePath, { fit: [69 * config.size[0], 69 * config.size[1]] })
        doc.addPage()
        doc.image(imagePath, { fit: [69 * config.size[0], 69 * config.size[1]] })
        doc.end()
      })
      .then(() => console.log(`Saved ${imagePath}.`))
  }
}

startHotReload()
