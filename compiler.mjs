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

async function startHotReload() {
  let htmlPaths = fs.readdirSync('./html').map((path) => './html/' + path)
  compileTemplates("change").then(() => { generateSpread('./templates/week-unified.handlebars', './templates/month.handlebars', './templates/week-unified-and-month.handlebars') })
  server.watch(htmlPaths)
  spawn('node', ['./node_modules/http-server/bin/http-server', '-p 8082'])
  console.log('Server with compiled HTML running at: http://localhost:8082/html/')
}

async function compileTemplates(eventType) {
  config = JSON.parse(fs.readFileSync('./config.json'))
  Object.keys(contexts).forEach((key) => {
    contexts[key] = config.templates[key]
    contexts[key].size = config.size
    contexts[key].dpi = config.dpi
    contexts[key].margins = config.margins
  })

  const promises = []
  for(let i = 0; i < paths.length; i++) {
    promises.push(compileTemplate(eventType, paths[i]))
  }

  return Promise.all(promises)
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
    return fsp.writeFile(buildHTMLPath(templatePath), string)
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
      .then(() => generateSpread(templatePath, templatePath, templatePath))
      .then(() => console.log(`Saved ${imagePath}.`))
  }
}

function generateSpread(frontTemplatePath, backTemplatePath, outputPath) {
  const doc = new PDFDocument({ size: 'LETTER', margin: 0 })
  doc.pipe(fs.createWriteStream(buildPDFPath(outputPath)))
  // the DPI has to be 96 when setting the puppeteer width/height args
  // but, because PDFs use a coordinate system of 72 points per inch,
  // we have to use 72 PPI here.
  doc.image(buildImagePath(frontTemplatePath), {
    fit: [8.5 * 72, config.size[1] * 72],
    align: 'center'
  }, (8.5 * 72 - config.size[0] * 72))
  doc.addPage()
  doc.image(buildImagePath(backTemplatePath), {
    fit: [8.5 * 72, config.size[1] * 72],
    align: 'center'
  }, (8.5 * 72 - config.size[0] * 72))
  doc.end()
}

startHotReload()
